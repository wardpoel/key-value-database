import Test from 'node:test';
import Database from '../../source/index.js';

import { LocalStorage } from 'node-localstorage';

import assert from 'node:assert/strict';

let localStorage = new LocalStorage('./test/unit/storage');

Test.beforeEach(async () => {
	localStorage.clear();
});

Test.afterEach(async () => {
	localStorage.clear();
});

Test('version with no migrations', () => {
	let database = new Database(localStorage);
	let version = database.version;

	assert.deepStrictEqual(version, undefined);
});

Test('version with a single migrations', () => {
	let migration = function () {};
	let migrations = [migration];
	let database = new Database(localStorage, { migrations });
	let version = database.version;

	assert.deepStrictEqual(version, 1);
});

Test('create table', () => {
	let database = new Database(localStorage);

	let table = database.addTable('cars');

	let cars = database.select('cars');

	assert.deepStrictEqual(cars.length, 0);
});

Test('create row', () => {
	let database = new Database(localStorage);

	let table = database.addTable('cars');
	let car = database.create('cars', { color: 'blue' });

	assert.deepStrictEqual(car.color, 'blue');

	let cars = database.select('cars');

	assert.deepStrictEqual(cars.length, 1);
	assert.deepStrictEqual(cars[0].color, 'blue');
});

Test('create row with id', () => {
	let database = new Database(localStorage);

	let table = database.addTable('cars');

	let car = database.create('cars', { id: 'abc', color: 'blue' });

	assert.deepStrictEqual(car.id, 'abc');

	let cars = database.select('cars');

	assert.deepStrictEqual(cars[0].id, 'abc');
});

Test('create row without id', () => {
	let database = new Database(localStorage);

	let table = database.addTable('cars');

	let car = database.create('cars', { color: 'blue' });
	let cars = database.select('cars');

	assert.deepStrictEqual(car.id, cars[0].id);
	assert.notDeepStrictEqual(car.id, undefined);
});

Test('create row without table', () => {
	let database = new Database(localStorage);

	assert.throws(
		() => {
			let car1 = database.create('cars', { color: 'red' });
		},
		{ message: /exist/ },
	);
});

Test('create duplicate ids', () => {
	let database = new Database(localStorage);

	let table = database.addTable('cars');
	let car = database.create('cars', { id: 'abc', color: 'red' });

	assert.throws(
		() => {
			let car = database.create('cars', { id: 'abc', color: 'blue' });
		},
		{ message: /exist/ },
	);
});

Test('create duplicate index', () => {
	let database = new Database(localStorage);

	let table = database.addTable('cars');
	let index = database.addIndex('cars', 'color');

	assert.throws(
		() => {
			database.addIndex('cars', 'color');
		},
		{ message: /exist/ },
	);
});

Test('create index on non existing table', () => {
	let database = new Database(localStorage);

	assert.throws(() => database.addIndex('cars'), { message: /exist/ });
});

Test('create row before index', () => {
	let database = new Database(localStorage);

	let table = database.addTable('cars');
	let car1 = database.create('cars', { color: 'red' });
	let car2 = database.create('cars', { color: 'blue' });
	let car3 = database.create('cars', { color: 'red' });
	let index = database.addIndex('cars', 'color');
	let cars = database.select('cars', { color: 'red' });

	assert.deepStrictEqual(cars.length, 2);
	assert.deepStrictEqual(cars[0].color, 'red');
	assert.deepStrictEqual(cars[1].color, 'red');
});

Test('create row after index', () => {
	let database = new Database(localStorage);

	let table = database.addTable('cars');
	let index = database.addIndex('cars', 'color');
	let car1 = database.create('cars', { color: 'red' });
	let car2 = database.create('cars', { color: 'blue' });
	let car3 = database.create('cars', { color: 'red' });
	let cars = database.select('cars', { color: 'red' });

	assert.deepStrictEqual(cars.length, 2);
	assert.deepStrictEqual(cars[0].color, 'red');
	assert.deepStrictEqual(cars[1].color, 'red');
});

Test('create index with multiple attributes', () => {
	let database = new Database(localStorage);

	let table = database.addTable('cars');
	let index = database.addIndex('cars', 'brand', 'color');
	let car1 = database.create('cars', { brand: 'tesla', color: 'red' });
	let car2 = database.create('cars', { brand: 'chevrolet', color: 'blue' });
	let car3 = database.create('cars', { brand: 'chevrolet', color: 'red' });
	let car4 = database.create('cars', { brand: 'chevrolet', color: 'red' });
	let cars = database.select('cars', { brand: 'chevrolet', color: 'red' });

	assert.deepStrictEqual(cars.length, 2);
	assert.deepStrictEqual(cars[0].color, 'red');
	assert.deepStrictEqual(cars[1].color, 'red');
	assert.deepStrictEqual(cars[0].brand, 'chevrolet');
	assert.deepStrictEqual(cars[1].brand, 'chevrolet');
});

Test('delete row', () => {
	let database = new Database(localStorage);

	database.addTable('cars');
	let car = database.create('cars', { color: 'red' });
	let deletedCar = database.delete('cars', car);
	let cars = database.select('cars');

	assert.deepStrictEqual(cars.length, 0);
	assert.deepStrictEqual(deletedCar.color, 'red');
});

Test('delete row as id', () => {
	let database = new Database(localStorage);

	let table = database.addTable('cars');
	let car = database.create('cars', { id: '123', color: 'red' });
	let deletedCar = database.delete('cars', '123');
	let cars = database.select('cars');

	assert.deepStrictEqual(cars.length, 0);
	assert.deepStrictEqual(deletedCar.color, 'red');
});

Test('delete row with id', () => {
	let database = new Database(localStorage);

	let table = database.addTable('cars');
	let car = database.create('cars', { id: '123', color: 'red' });
	let deletedCar = database.delete('cars', { id: '123' });
	let cars = database.select('cars');

	assert.deepStrictEqual(cars.length, 0);
	assert.deepStrictEqual(deletedCar.color, 'red');
});

Test('delete table', () => {
	let database = new Database(localStorage);

	database.addTable('cars');
	database.addIndex('cars', 'color');
	database.create('cars', { color: 'red' });
	database.removeTable('cars');
	database.addTable('cars');

	let cars = database.select('cars');

	assert.deepStrictEqual(cars.length, 0);
});

Test('update', () => {
	let database = new Database(localStorage);

	database.addTable('cars');
	let oldCar = database.create('cars', { brand: 'Tesla', color: 'red' });
	let newCar = database.update('cars', oldCar, { color: 'blue' });

	let cars = database.select('cars');

	assert.deepStrictEqual(cars.length, 1);
	assert.deepStrictEqual(cars[0].brand, 'Tesla');
	assert.deepStrictEqual(cars[0].color, 'blue');
});

Test('update by id', () => {
	let database = new Database(localStorage);

	database.addTable('cars');
	let oldCar = database.create('cars', { id: 123, brand: 'Tesla', color: 'red' });
	let newCar = database.update('cars', 123, { color: 'blue' });

	let cars = database.select('cars');

	assert.deepStrictEqual(cars.length, 1);
	assert.deepStrictEqual(cars[0].brand, 'Tesla');
	assert.deepStrictEqual(cars[0].color, 'blue');
});

Test('replace', () => {
	let database = new Database(localStorage);

	database.addTable('cars');
	let oldCar = database.create('cars', { brand: 'Tesla', color: 'red' });
	let newCar = database.replace('cars', oldCar, { color: 'blue' });

	let cars = database.select('cars');

	assert.deepStrictEqual(cars.length, 1);
	assert.deepStrictEqual(cars[0].brand, undefined);
	assert.deepStrictEqual(cars[0].color, 'blue');
});

Test('replace by id', () => {
	let database = new Database(localStorage);

	database.addTable('cars');
	let oldCar = database.create('cars', { id: 123, brand: 'Tesla', color: 'red' });
	let newCar = database.replace('cars', 123, { color: 'blue' });

	let cars = database.select('cars');

	assert.deepStrictEqual(cars.length, 1);
	assert.deepStrictEqual(cars[0].brand, undefined);
	assert.deepStrictEqual(cars[0].color, 'blue');
});

Test('count', () => {
	let database = new Database(localStorage);

	let table = database.addTable('cars');
	database.create('cars', { color: 'red' });
	database.create('cars', { color: 'blue' });

	let count = database.count('cars');

	assert.deepStrictEqual(count, 2);
});

Test('count with index', () => {
	let database = new Database(localStorage);

	let table = database.addTable('cars');
	let index = database.addIndex('cars', 'color');
	database.create('cars', { color: 'red' });
	database.create('cars', { color: 'blue' });
	database.create('cars', { color: 'blue' });

	let count = database.count('cars', { color: 'blue' });

	assert.deepStrictEqual(count, 2);
});

Test('dynamic functions', () => {
	let database = new Database(localStorage);

	let table = database.addTable('cars', 'car');
	let car1 = database.createCar({ color: 'red' });
	let car2 = database.createCar({ color: 'blue' });
	let cars = database.selectCars();

	assert.deepStrictEqual(cars.length, 2);
	assert.deepStrictEqual(cars[0].color, 'red');
	assert.deepStrictEqual(cars[1].color, 'blue');
});

Test('select with id property', () => {
	let database = new Database(localStorage);

	let table = database.addTable('cars', 'car');
	let car = database.createCar({ color: 'red' });
	let cars = database.select('cars', { id: car.id });

	assert.strictEqual(cars.length, 1);
	assert.strictEqual(cars[0].color, car.color);
});

Test('select with id property and autoindex', () => {
	let database = new Database(localStorage);

	let table = database.addTable('cars', 'car');
	let car = database.createCar({ color: 'red' });
	let cars = database.select('cars', { id: car.id }, true);

	assert.strictEqual(cars.length, 1);
	assert.strictEqual(cars[0].color, car.color);
});

Test('select with id and equal properties', () => {
	let database = new Database(localStorage);

	let table = database.addTable('cars', 'car');
	let car = database.createCar({ color: 'red' });
	let cars = database.select('cars', { id: car.id, color: 'red' }, true);

	assert.strictEqual(cars.length, 1);
	assert.strictEqual(cars[0].color, car.color);
});

Test('select with id and different properties', () => {
	let database = new Database(localStorage);

	let table = database.addTable('cars', 'car');
	let car = database.createCar({ color: 'red' });
	let cars = database.select('cars', { id: car.id, color: 'blue' }, true);

	assert.strictEqual(cars.length, 0);
});
