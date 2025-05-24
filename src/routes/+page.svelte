<script lang="ts">
	import type { Group, Payment } from '$lib';

	let groups: Group[] = $state([{ name: 'Main', quantity: 5, ratio: 1 }]);
	let total = $state(100);
	let withTips = $state(true);
	let tipPercent = $state(10);
	let payments: Payment[] = $state([{ quantityByGroupIndex: [0], amount: 0, description: '' }]);

	let grandTotal = $derived(total * (withTips ? 1 + tipPercent / 100 : 1));
	let totalQuantity = $derived(groups.reduce((p, c) => p + c.quantity, 0));
	let originalPerPerson: number[] = $derived.by(() => {
		const weighedQuantities = groups.map((e) => e.quantity * e.ratio);
		const totalWeight = weighedQuantities.reduce((p, c) => p + c, 0);
		return groups.map((e, i) => (grandTotal * weighedQuantities[i]) / totalWeight / e.quantity);
	});
	let payersQuantityByGroup: number[] = $derived(
		groups.map((_, ig) => payments.reduce((p, c) => p + c.quantityByGroupIndex[ig] || 0, 0))
	);
	let totalPayments = $derived(payments.reduce((p, c) => p + c.amount, 0));
	let remainingTotal = $derived(grandTotal - totalPayments);
	let remainingQuantityByGroup = $derived(groups.map((e, ig) => e.quantity - payersQuantityByGroup[ig]));

	let remainingPerGroup: number[] = $derived.by(() => {
		const weighedRemainingQuantities = groups.map((e, ig) => remainingQuantityByGroup[ig] * e.ratio);
		const totalWeight = weighedRemainingQuantities.reduce((p, c) => p + c, 0);
		return weighedRemainingQuantities.map((e) => (remainingTotal * e) / totalWeight);
	});
	let remainingPerPerson = $derived(remainingPerGroup.map((e, i) => e / remainingQuantityByGroup[i]));

	// Local Storage
	try {
		const dataJson = window.localStorage.getItem('data');
		if (dataJson !== null) {
			const data = JSON.parse(dataJson);
			groups = data['groups'];
			total = data['total'];
			withTips = data['withTips'];
			tipPercent = data['tipPercent'];
			payments = data['payments'];
		}
	} catch (_) {
		console.error('Could not get data from localStorage. Deleting');
		window.localStorage.removeItem('data');
	}

	$effect(() => {
		window.localStorage.setItem('data', JSON.stringify({ groups, total, withTips, tipPercent, payments }));
	});

	// HTML Helpers

	function addGroup() {
		groups.push({ name: '', quantity: 1, ratio: 1 });
	}

	function deleteGroup(index: number) {
		groups = groups.filter((_, i) => i !== index);
	}

	function addPayment() {
		payments.push({
			quantityByGroupIndex: Array(groups.length).fill(0),
			amount: 0,
			description: ''
		});
	}

	function deletePayment(index: number) {
		payments = payments.filter((_, i) => i !== index);
	}

	function reset() {
		if (!confirm('Are you sure you want to reset app?')) {
			return;
		}
		window.localStorage.removeItem('data');
		location.reload();
	}

	function format(val: number) {
		return Math.round(val).toLocaleString('en-us');
	}
</script>

<main class="m-6 flex flex-col items-center space-y-6">
	<div class="flex flex-col items-center space-y-3 border-2 border-sky-300 bg-sky-100 p-3">
		<h2>Totals</h2>
		<label>
			Amount:
			<input type="number" class="w-32" bind:value={total} />
		</label>

		<span>
			<label>
				With Tips <input type="checkbox" bind:checked={withTips} />
			</label>
			<input type="number" disabled={!withTips} class="ml-4 w-16" bind:value={tipPercent} /> %
		</span>

		<p>
			Grand Total: {format(grandTotal)}
		</p>
	</div>

	{#if groups.length === 1}
		<div
			class="grid gap-3 border-2 border-sky-300 bg-sky-100 p-3"
			style="grid-template-columns: repeat(3, max-content)"
		>
			<label for="qty">Number of people:</label>
			<input id="qty" type="number" class="w-16" bind:value={groups[0].quantity} />
			<button class="btn row-span-3" onclick={addGroup}>Multiple<br />Groups</button>

			<span>Original per person:</span>
			<span>{format(originalPerPerson[0])}</span>

			<span>Remaining per person:</span>
			<span>{format(remainingPerPerson[0])}</span>
		</div>
	{:else}
		<table>
			<thead>
				<tr>
					<th colspan="5" class="text-xl font-bold">Group Setup</th>
					<th colspan="2" class="text-xl">Remaining</th>
				</tr>
				<tr>
					<th>Name</th>
					<th>Qty.</th>
					<th>Ratio</th>
					<th></th>
					<th class="text-sm">Per<br />Person</th>
					<th>Group</th>
					<th class="text-sm">Per<br />Person</th>
				</tr>
			</thead>
			<tbody>
				{#each groups as group, i}
					<tr>
						<td>
							<input type="text" class:border-red-500={!group.name} class="w-36" bind:value={group.name} />
						</td>
						<td><input type="number" class="w-16" bind:value={group.quantity} /></td>
						<td><input type="number" class="w-16" bind:value={group.ratio} /></td>
						<td>
							<button class="px-1 text-xl font-bold text-red-500" onclick={() => deleteGroup(i)}>X</button>
						</td>
						<td class="text-right">{format(originalPerPerson[i])}</td>
						<td class="text-right" class:text-red-500={remainingPerGroup[i] > 0}>
							{format(remainingPerGroup[i])}
						</td>
						<td class="text-right">{format(remainingPerPerson[i])}</td>
					</tr>
				{/each}
			</tbody>
			<tfoot>
				<tr class="font-bold">
					<td class="text-right">Total: </td>
					<td>{totalQuantity}</td>
					<td></td>
					<td><button class="px-1 text-3xl text-green-600" onclick={addGroup}>+</button></td>
					<td></td>
					<td class="text-right" class:text-red-500={remainingTotal >= 1}>
						{format(remainingTotal)}
					</td>
					<td></td>
				</tr>
			</tfoot>
		</table>
	{/if}

	<table>
		<thead>
			<tr>
				<th colspan="100" class="text-xl font-bold">Payments</th>
			</tr>
			<tr>
				{#each groups as group}
					<th>{groups.length === 1 ? '# of People' : group.name}</th>
				{/each}
				<th>Amount</th>
				<th>Description</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each payments as payment, i}
				<tr>
					{#each groups as _, ig}
						<td><input type="number" class="w-12" bind:value={payment.quantityByGroupIndex[ig]} /></td>
					{/each}
					<td><input type="number" class="w-20" bind:value={payment.amount} /></td>
					<td><input type="text" bind:value={payment.description} /></td>
					<td><button class="px-1 text-xl font-bold text-red-500" onclick={() => deletePayment(i)}>X</button></td>
				</tr>
			{/each}
		</tbody>
		<tfoot>
			<tr class="font-bold">
				{#each payersQuantityByGroup as totalGroupQuantity}
					<td>{totalGroupQuantity}</td>
				{/each}
				<td>{format(totalPayments)}</td>
				<td>Totals</td>
				<td rowspan="3"><button class="px-1 py-5 text-3xl font-bold text-green-600" onclick={addPayment}>+</button></td>
			</tr>
			<tr class="bg-red-100 font-bold">
				{#each remainingQuantityByGroup as remaining}
					<td class:text-red-500={remaining > 0}>{remaining}</td>
				{/each}
				<td class:text-red-500={remainingTotal >= 1}>{format(remainingTotal)}</td>
				<td>Remaining</td>
			</tr>
		</tfoot>
	</table>

	<button class="btn" onclick={reset}>Reset</button>
</main>

<style lang="postcss">
	@reference "tailwindcss";
	table {
		@apply bg-sky-100;
	}

	td,
	th {
		@apply border-2 border-sky-300 p-1;
	}
</style>
