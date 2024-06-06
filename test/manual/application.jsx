import Database, { useSelect, useSelectById, useSelectIds } from '../../source/index.js';

/** @typedef {import('../../source/types.js').Id} Id */

let database = new Database(localStorage, {
	migrations: [
		database => {
			database.addTable('cars');
			database.addIndex('cars', 'brand', 'color');
		},
	],
});

/** @type {Object<string,string>} */
const COLORS = { red: '🚗', blue: '🚙' };

let useSelectCars = useSelect.bind(this, database, 'cars');

export default function Application() {
	let carIds = useSelectIds(database, 'cars');
	let carElements = carIds.map(id => <Car key={id} id={id} />);

	let filteredCars = useSelectCars({ brand: 'Tesla', color: 'blue' });
	let filteredCarElements = filteredCars.map(car => <Car key={car.id} id={car.id} brand={car.brand} color={car.color} />);

	function handleClick() {
		let brand = Math.random() < 0.5 ? 'Kia' : 'Tesla';
		let color = Math.random() < 0.5 ? 'red' : 'blue';

		database.create('cars', { brand, color });
	}

	return (
		<>
			<div>{carElements}</div>
			<button onClick={handleClick}>Add a car</button>
			<div>{filteredCarElements}</div>
		</>
	);
}

/** @param {{id: Id, brand?: string, color?: string}} props */
function Car(props) {
	let carId = props.id;

	let car = useSelectById(database, 'cars', carId);

	let brand = props.brand ?? car?.brand;
	let color = props.color ?? car?.color;

	function handleClick() {
		database.update('cars', carId, { color: car?.color === 'blue' ? 'red' : 'blue' });
	}

	if (car) {
		return (
			<button onClick={handleClick}>
				{COLORS[color]} {brand}
			</button>
		);
	}
}
