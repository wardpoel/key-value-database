/***
 * @param {Array<string>} strings
 */
export default function enumerate(...strings) {
	let result;
	if (strings.length === 1) {
		result = strings[0];
	} else if (strings.length === 2) {
		result = `${strings[0]} and ${strings[1]}`;
	} else {
		result = `${strings.slice(0, -1).join(', ')}, and ${strings[strings.length - 1]}`;
	}
	return result;
}
