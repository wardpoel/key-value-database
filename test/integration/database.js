import Database from '../../source/index.js';

let migration = function (database) {
	database.addTable('cars');
};

let database = new Database(localStorage, { migrations: [migration] });

window['Database'] = Database;

export default database;
