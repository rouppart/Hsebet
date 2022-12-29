<script lang="ts">
  let groups: Group[] = [{name: 'Main', quantity: 5, ratio: 1}];
  let total = 100;
  let withTips = true;
  let tipPercent = 10;
  let payments: Payment[] = [{quantityByGroupIndex: [0], amount: 0, description: ''}];

  $: grandTotal = total * (withTips ? 1 + tipPercent / 100 : 1);
  $: totalQuantity = groups.reduce((p, c) => p + c.quantity, 0);
  let originalPerPerson: number[];
  $: {
    const weighedQuantities = groups.map(e => e.quantity * e.ratio);
    const totalWeight = weighedQuantities.reduce((p, c) => p + c, 0);
    originalPerPerson = groups.map((e, i) => grandTotal * weighedQuantities[i] / totalWeight / e.quantity);
  }
  $: payersQuantityByGroup = groups.map(
    (_, ig) => payments.reduce((p, c) => p + c.quantityByGroupIndex[ig] || 0, 0)
  ) as number[];
  $: totalPayments = payments.reduce((p, c) => p + c.amount, 0);
  $: remainingTotal = grandTotal - totalPayments;
  $: remainingQuantityByGroup = groups.map((e, ig) => e.quantity - payersQuantityByGroup[ig]);

  let remainingPerGroup: number[];
  $: {
    const weighedRemainingQuantities = groups.map((e, ig) => remainingQuantityByGroup[ig] * e.ratio);
    const totalWeight = weighedRemainingQuantities.reduce((p, c) => p + c, 0);
    remainingPerGroup = weighedRemainingQuantities.map(e => remainingTotal * e / totalWeight);
  }
  $: remainingPerPerson = remainingPerGroup.map((e, i) => e / remainingQuantityByGroup[i]);

  // Local Storage
  try {
    const data = JSON.parse(window.localStorage.getItem('data'));
    ({groups, total, withTips, tipPercent, payments} = data);
  } catch (_) {
    console.error('Could not get data from localStorage. Deleting');
    window.localStorage.removeItem('data');
  }
  $: window.localStorage.setItem('data', JSON.stringify({groups, total, withTips, tipPercent, payments}));

  // HTML Helpers

  function addGroup() {
    groups = [...groups, {name: '', quantity: 1, ratio: 1}];
  }

  function deleteGroup(index: number) {
    groups = groups.filter((_, i) => i !== index);
  }

  function addPayment() {
    payments = [...payments, {quantityByGroupIndex: Array(groups.length).fill(0), amount: 0, description: ''}];
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

<main class="flex flex-col items-center space-y-6 m-6">
  <div class="flex flex-col items-center space-y-3 bg-sky-100 border-2 border-sky-300 p-3">
    <h2>Totals</h2>
    <label>
      Amount:
      <input type="number" class="w-32" bind:value={total}>
    </label>

    <span>
      <label>
        With Tips <input type="checkbox" bind:checked={withTips}>
      </label>
      <input type="number" disabled={!withTips} class="ml-4 w-16" bind:value={tipPercent}> %
    </span>

    <p>
      Grand Total: {format(grandTotal)}
    </p>
  </div>

  {#if groups.length === 1}
  <div class="bg-sky-100 border-2 border-sky-300 p-3 grid gap-3" style="grid-template-columns: repeat(3, max-content)">
    <label for="qty">Number of people:</label>
    <input id="qty" type="number" class="w-16" bind:value={groups[0].quantity}>
    <button class="btn row-span-3" on:click={addGroup}>Multiple<br>Groups</button>

    <span>Original per person:</span>
    <span>{format(originalPerPerson[0])}</span>

    <span>Remaining per person:</span>
    <span>{format(remainingPerPerson[0])}</span>

  </div>
  {:else}
  <table>
    <tr>
      <th colspan="5" class="font-bold text-xl">Group Setup</th>
      <th colspan="2" class="text-xl">Remaining</th>
    </tr>
    <tr>
      <th>Name</th>
      <th>Qty.</th>
      <th>Ratio</th>
      <th></th>
      <th class="text-sm">Per<br>Person</th>
      <th>Group</th>
      <th class="text-sm">Per<br>Person</th>
    </tr>
    {#each groups as group, i}
    <tr>
      <td><input type="text" class:border-red-500={!group.name} class="w-36" bind:value={group.name}></td>
      <td><input type="number" class="w-16" bind:value={group.quantity}></td>
      <td><input type="number" class="w-16" bind:value={group.ratio}></td>
      <td><button class="text-red-500 font-bold text-xl px-1" on:click={() => deleteGroup(i)}>X</button></td>
      <td class="text-right">{format(originalPerPerson[i])}</td>
      <td class="text-right" class:text-red-500={remainingPerGroup[i] > 0}>{format(remainingPerGroup[i])}</td>
      <td class="text-right">{format(remainingPerPerson[i])}</td>
    </tr>
    {/each}
    <tr class="font-bold">
      <td class="text-right">Total: </td>
      <td>{totalQuantity}</td>
      <td></td>
      <td><button class="text-green-600 text-3xl px-1" on:click={addGroup}>+</button></td>
      <td></td>
      <td class="text-right" class:text-red-500={remainingTotal >= 1}>{format(remainingTotal)}</td>
      <td></td>
    </tr>
  </table>
  {/if}

  <table>
    <tr>
      <th colspan="100"  class="font-bold text-xl">Payments</th>
    </tr>
    <tr>
      {#each groups as group}
      <th>{groups.length === 1 ? '# of People' : group.name}</th>
      {/each}
      <th>Amount</th>
      <th>Description</th>
      <th></th>
    </tr>
    {#each payments as payment, i}
    <tr>
      {#each groups as _, ig}
      <td><input type="number" class="w-12" bind:value={payment.quantityByGroupIndex[ig]}></td>
      {/each}
      <td><input type="number" class="w-20" bind:value={payment.amount}></td>
      <td><input type="text" bind:value={payment.description}></td>
      <td><button class="text-red-500 font-bold text-xl px-1" on:click={() => deletePayment(i)}>X</button></td>
    </tr>
    {/each}
    <tr class="font-bold">
      {#each payersQuantityByGroup as totalGroupQuantity}
      <td>{totalGroupQuantity}</td>
      {/each}
      <td>{format(totalPayments)}</td>
      <td>Totals</td>
      <td rowspan="3"><button class="text-green-600 font-bold text-3xl px-1 py-5" on:click={addPayment}>+</button></td>
    </tr>
    <tr class="font-bold bg-red-100">
      {#each remainingQuantityByGroup as remaining}
      <td class:text-red-500={remaining > 0}>{remaining}</td>
      {/each}
      <td class:text-red-500={remainingTotal >= 1}>{format(remainingTotal)}</td>
      <td>Remaining</td>
    </tr>
  </table>

  <button class="btn" on:click={reset}>Reset</button>
</main>

<style lang="postcss">
    table {
        @apply bg-sky-100;
    }

    td, th {
        @apply p-1 border-2 border-sky-300;
    }
</style>
