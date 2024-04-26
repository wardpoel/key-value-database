import Database, { useSelect } from '../../source/index.js';

let database = new Database(localStorage, {
	migrations: [
		database => {
			database.addTable('cars');
		},
	],
});

const CARS = { red: '🚗', blue: '🚙' };

export default function Application() {
	let cars = useSelect(database, 'cars');
	let carElements = cars.map(car => CARS[car.color]);

	function handleClick() {
		let brand = Math.random() < 0.5 ? 'Kia' : 'Ford';
		let color = Math.random() < 0.5 ? 'red' : 'blue';

		database.create('cars', { brand, color });
	}

	return (
		<>
			<button onClick={handleClick}>Add a car</button>
			<div>{carElements}</div>
		</>
	);
}
