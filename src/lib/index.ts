// place files you want to import through the `$lib` alias in this folder.

export interface Group {
	name: string;
	quantity: number;
	ratio: 1;
}

export interface Payment {
	description: string;
	amount: number;
	quantityByGroupIndex: number[];
}
