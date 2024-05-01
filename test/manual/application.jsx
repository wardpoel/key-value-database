import Database, { useFind, useSelect, useIndex } from '../../source/index.js';

let database = new Database(localStorage, {
	migrations: [
		database => {
			database.addTable('cars');
			database.addIndex('cars', 'brand', 'color');
		},
	],
});

const COLORS = { red: '🚗', blue: '🚙' };

let useSelectCars = useSelect.bind(this, database, 'cars');

export default function Application() {
	let carIds = useIndex(database, 'cars');
	let carElements = carIds.map(id => <Car key={id} id={id} />);

	let filteredCars = useSelectCars({ brand: 'Tesla', color: 'blue' });
	let filteredCarElements = filteredCars.map(car => (
		<Car key={car.id} id={car.id} brand={car.brand} color={car.color} />
	));

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

function Car(props) {
	let carId = props.id;

	/** @type {{ id: string | number, color: string, brand: string }} */
	let car = useFind(database, 'cars', carId);

	let { brand = props.brand ?? car.brand, color = props.color ?? car.color } = car;

	function handleClick() {
		database.update('cars', carId, { color: car.color === 'blue' ? 'red' : 'blue' });
	}

	if (car) {
		return (
			<button onClick={handleClick}>
				{COLORS[color]} {brand}
			</button>
		);
	}
}
