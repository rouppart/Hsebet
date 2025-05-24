<script lang="ts">
	import type { Group, Payment } from '$lib';

	// States
	let groups: Group[] = $state([{ name: 'Main', ratio: 1 }]);
	let bill = $state(100);
	let withTips = $state(true);
	let tipPercent = $state(10);
	let payments: Payment[] = $state([{ countByGroupIndex: [1], amount: null, description: '' }]);

	// Derived
	let total = $derived(bill * (withTips ? 1 + tipPercent / 100 : 1));

	let perGroupCount: number[] = $derived(
		groups.map((_, i) => payments.reduce((p, c) => p + (c.countByGroupIndex[i] ?? 0), 0))
	);
	let totalCount = $derived(perGroupCount.reduce((p, c) => p + c, 0));
	let totalPaid = $derived(payments.reduce((p, c) => p + (c.amount ?? 0), 0));
	let totalRemaining = $derived(total - totalPaid);

	let paymentsCompleted = $derived(payments.filter((e) => e.amount));
	let perGroupCountCompleted: number[] = $derived(
		groups.map((_, i) => paymentsCompleted.reduce((p, c) => p + (c.countByGroupIndex[i] ?? 0), 0))
	);
	let perGroupCountRemaining = $derived(groups.map((_, i) => perGroupCount[i] - perGroupCountCompleted[i]));

	let perPersonIdeal: number[] = $derived.by(() => {
		const weighedCounts = groups.map((e, i) => perGroupCount[i] * e.ratio);
		const totalWeight = weighedCounts.reduce((p, c) => p + c, 0);
		return groups.map((_, i) => (total * weighedCounts[i]) / totalWeight / perGroupCount[i] || 0);
	});

	let perPersonRemaining: number[] = $derived.by(() => {
		const weighedCountsRemaining = groups.map((e, i) => perGroupCountRemaining[i] * e.ratio);
		const totalWeight = weighedCountsRemaining.reduce((p, c) => p + c, 0);
		return weighedCountsRemaining.map((e, i) => (totalRemaining * e) / totalWeight / perGroupCountRemaining[i] || 0);
	});

	// Local Storage
	try {
		const dataJson = window.localStorage.getItem('data');
		if (dataJson !== null) {
			const data = JSON.parse(dataJson);
			groups = data['groups'];
			bill = data['bill'];
			withTips = data['withTips'];
			tipPercent = data['tipPercent'];
			payments = data['payments'];
		}
	} catch (_) {
		console.error('Could not get data from localStorage. Deleting');
		window.localStorage.removeItem('data');
	}

	$effect(() => {
		window.localStorage.setItem('data', JSON.stringify({ groups, bill, withTips, tipPercent, payments }));
	});

	// HTML Helpers

	function addGroup() {
		groups.push({ name: '', ratio: 1 });
	}

	function deleteGroup(index: number) {
		groups = groups.filter((_, i) => i !== index);
	}

	function addPayment() {
		payments.push({
			countByGroupIndex: Array(groups.length).fill(groups.length > 1 ? 0 : 1),
			amount: null,
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

<main class="m-6 flex flex-col items-center gap-6">
	<div class="flex flex-col items-center space-y-3 border-2 border-sky-300 bg-sky-100 p-3">
		<h2>Totals</h2>
		<label>
			Bill:
			<input type="number" class="w-32" bind:value={bill} />
		</label>

		<span class="flex items-center">
			<label>
				With Tips <input type="checkbox" bind:checked={withTips} />
			</label>
			{#if withTips}
				<input type="number" disabled={!withTips} class="ml-4 w-16" bind:value={tipPercent} />
				<span class="ml-1">%</span>
			{/if}
		</span>
		{#if withTips}
			<p>
				Total: {format(total)}
			</p>
		{/if}
	</div>

	{#if groups.length === 1}
		<div
			class="grid gap-3 border-2 border-sky-300 bg-sky-100 p-3"
			style="grid-template-columns: repeat(3, max-content)"
		>
			<label for="qty">Number of people:</label>
			<span>{perGroupCount[0]}</span>
			<button class="btn row-span-3" onclick={addGroup}>Multiple<br />Groups</button>

			<span>Ideal per person:</span>
			<span>{format(perPersonIdeal[0])}</span>

			<span>Remaining per person:</span>
			<span>{format(perPersonRemaining[0])}</span>
		</div>
	{:else}
		<table>
			<thead>
				<tr>
					<th colspan="4" class="text-xl font-bold">Group Setup</th>
					<th rowspan="2" class="text-sm">Ideal<br /> per<br /> person</th>
					<th rowspan="2" class="text-sm">Remaining<br /> per<br /> person</th>
				</tr>
				<tr>
					<th>Name</th>
					<th>Ratio</th>
					<th>Count</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each groups as group, i}
					<tr>
						<td>
							<input type="text" class:border-red-500={!group.name} class="w-36" bind:value={group.name} />
						</td>
						<td><input type="number" class="w-16" bind:value={group.ratio} /></td>
						<td>{perGroupCount[i]}</td>
						<td>
							<button class="px-1 text-xl font-bold text-red-500" onclick={() => deleteGroup(i)}>X</button>
						</td>
						<td class="text-right">{format(perPersonIdeal[i])}</td>
						<td class="text-right">{format(perPersonRemaining[i])}</td>
					</tr>
				{/each}
			</tbody>
			<tfoot>
				<tr class="font-bold">
					<td><button class="px-1 text-3xl text-green-600" onclick={addGroup}>+</button></td>
					<td class="text-right">Total:</td>
					<td colspan="4">{totalCount}</td>
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
				<th>Description</th>
				{#each groups as group}
					<th>{groups.length === 1 ? '# of people' : group.name}</th>
				{/each}
				<th>Amount</th>
				<th></th>
			</tr>
		</thead>
		<tbody>
			{#each payments as payment, i}
				<tr class:bg-green-200={payment.amount}>
					<td><input type="text" bind:value={payment.description} /></td>
					{#each groups as _, ig}
						<td><input type="number" class="w-12" bind:value={payment.countByGroupIndex[ig]} /></td>
					{/each}
					<td>
						<input
							type="number"
							class="w-20"
							bind:value={payment.amount}
							placeholder={groups
								.map((_, i) => perPersonRemaining[i] * (payment.countByGroupIndex[i] ?? 0))
								.reduce((p, c) => p + c, 0)
								.toFixed(0)}
						/>
					</td>
					<td><button class="px-1 text-xl font-bold text-red-500" onclick={() => deletePayment(i)}>X</button></td>
				</tr>
			{/each}
		</tbody>
		<tfoot>
			<tr class="font-bold">
				<td>Paid</td>
				{#each perGroupCountCompleted as count}
					<td>{count}</td>
				{/each}
				<td>{format(totalPaid)}</td>
				<td rowspan="2">
					<button class="px-1 py-5 text-3xl font-bold text-green-600" onclick={addPayment}>+</button>
				</td>
			</tr>
			<tr class="bg-red-100 font-bold">
				<td>Remaining</td>
				{#each perGroupCountRemaining as count}
					<td class:text-red-500={count > 0}>{count}</td>
				{/each}
				<td class:text-red-500={totalRemaining >= 1}>{format(totalRemaining)}</td>
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
