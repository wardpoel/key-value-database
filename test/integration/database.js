import Database from '../../source/index.js';

let database = new Database(localStorage);

database.addTable('cars');
database.create('cars', { brand: 'Kia', color: 'blue' });

window['Database'] = Database;

export default database;
