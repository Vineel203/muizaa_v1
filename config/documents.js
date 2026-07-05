'use strict';

const path = require('path');

module.exports = {
  templatesDir: path.join(__dirname, '..', 'templates'),
  templateImagesDir: path.join(__dirname, '..', 'templates', 'images'),
  localStorageDir: path.join(__dirname, '..', 'storage', 'GDM'),
  gdmFolderName: 'GDM',
  packageNameOptions: ['Bags', 'Boxes', 'Drums', 'Cartons', 'Bundles'],
  gdmDefaults: {
    ratePerMt: '',
    totalFreight: '-',
    freightPaid: '-',
    freightPayable: 'TO BE BILLED',
  },
  gdmPageFormat: 'A4',
};
