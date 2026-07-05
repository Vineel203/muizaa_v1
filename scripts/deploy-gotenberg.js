'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectId = process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'muizaa';
const region = process.env.GCP_REGION || 'us-east4';
const serviceName = process.env.GOTENBERG_SERVICE_NAME || 'muizaa-gotenberg';
const appHostingSa = process.env.APP_HOSTING_SA
  || `firebase-app-hosting-compute@${projectId}.iam.gserviceaccount.com`;

function resolveGcloudCommand() {
  if (process.env.GCLOUD_PATH && fs.existsSync(process.env.GCLOUD_PATH)) {
    return `"${process.env.GCLOUD_PATH}"`;
  }

  const localAppData = process.env.LOCALAPPDATA || '';
  const candidates = [
    path.join(localAppData, 'Google', 'Cloud SDK', 'google-cloud-sdk', 'bin', 'gcloud.cmd'),
    'C:\\Program Files\\Google\\Cloud SDK\\google-cloud-sdk\\bin\\gcloud.cmd',
    'C:\\Program Files (x86)\\Google\\Cloud SDK\\google-cloud-sdk\\bin\\gcloud.cmd',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return `"${candidate}"`;
    }
  }

  try {
    const found = execSync('where gcloud', { encoding: 'utf8' }).trim().split(/\r?\n/)[0];
    if (found) {
      return `"${found}"`;
    }
  } catch {
    // Not on PATH
  }

  return null;
}

function printManualInstructions() {
  console.error('\ngcloud CLI was not found on this machine.\n');
  console.error('Option A — Install Google Cloud SDK (recommended):');
  console.error('  https://cloud.google.com/sdk/docs/install');
  console.error('  After install, restart PowerShell and run: gcloud auth login');
  console.error('  Then run again: npm run deploy:gotenberg\n');
  console.error('Option B — Use Google Cloud Shell (no local install):');
  console.error('  1. Open https://console.cloud.google.com/run?project=muizaa');
  console.error('  2. Click "Create service"');
  console.error('  3. Container image URL: gotenberg/gotenberg:8');
  console.error('  4. Service name: muizaa-gotenberg');
  console.error('  5. Region: us-east4');
  console.error('  6. Authentication: Require authentication');
  console.error('  7. Container port: 3000');
  console.error('  8. Memory: 1 GiB, CPU: 1, Request timeout: 120s');
  console.error('  9. After deploy, open the service → Permissions → Grant Access');
  console.error(`     Principal: ${appHostingSa}`);
  console.error('     Role: Cloud Run Invoker');
  console.error(' 10. Copy the service URL and run:');
  console.error(`     firebase apphosting:secrets:set GOTENBERG_URL --project ${projectId}`);
  console.error(`     firebase apphosting:secrets:grantaccess GOTENBERG_URL --backend muizaa --project ${projectId}\n`);
  console.error('Option C — If gcloud is installed but not on PATH, set GCLOUD_PATH, e.g.:');
  console.error('  $env:GCLOUD_PATH="C:\\Program Files\\Google\\Cloud SDK\\google-cloud-sdk\\bin\\gcloud.cmd"');
  console.error('  npm run deploy:gotenberg\n');
}

function run(gcloud, command) {
  console.log(`\n> ${command}\n`);
  execSync(`${gcloud} ${command}`, { stdio: 'inherit', shell: true });
}

function main() {
  const gcloud = resolveGcloudCommand();
  if (!gcloud) {
    printManualInstructions();
    process.exit(1);
  }

  console.log(`Using gcloud: ${gcloud}`);
  console.log(`Deploying Gotenberg to Cloud Run (${projectId}/${region})...`);

  run(gcloud, [
    'run deploy',
    serviceName,
    '--image gotenberg/gotenberg:8',
    `--project ${projectId}`,
    `--region ${region}`,
    '--platform managed',
    '--port 3000',
    '--memory 1Gi',
    '--cpu 1',
    '--timeout 120',
    '--max-instances 5',
    '--no-allow-unauthenticated',
  ].join(' '));

  run(gcloud, [
    'run services add-iam-policy-binding',
    serviceName,
    `--project ${projectId}`,
    `--region ${region}`,
    `--member=serviceAccount:${appHostingSa}`,
    '--role=roles/run.invoker',
  ].join(' '));

  const serviceUrl = execSync(
    `${gcloud} run services describe ${serviceName} --project ${projectId} --region ${region} --format="value(status.url)"`,
    { encoding: 'utf8', shell: true }
  ).trim();

  console.log('\nGotenberg deployed.');
  console.log(`Service URL: ${serviceUrl}`);
  console.log('\nNext steps:');
  console.log(`  firebase apphosting:secrets:set GOTENBERG_URL --project ${projectId}`);
  console.log(`  (paste: ${serviceUrl})`);
  console.log(`  firebase apphosting:secrets:grantaccess GOTENBERG_URL --backend muizaa --project ${projectId}`);
  console.log('\nThen push your latest app code and generate a GDM again on prod.');
}

main();
