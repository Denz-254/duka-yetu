export function mpesaSteps(mode, amountLabel) {
  if (!mode?.configured) {
    return ['Set a Paybill, Till, or Send Money number in Payment Settings.'];
  }
  if (mode.account_type === 'send_money') {
    return [
      'Open M-Pesa and choose Send Money',
      `Phone number: ${mode.send_money_phone}`,
      `Amount: ${amountLabel}`,
      'Enter the M-Pesa PIN',
      'Mark paid only after the M-Pesa SMS arrives',
    ];
  }
  if (mode.account_type === 'till') {
    return [
      'Open M-Pesa, then Lipa na M-Pesa',
      'Choose Buy Goods and Services',
      `Till number: ${mode.shortcode}`,
      `Amount: ${amountLabel}`,
      'Mark paid after the M-Pesa message arrives',
    ];
  }
  return [
    'Open M-Pesa, then Lipa na M-Pesa',
    'Choose Pay Bill',
    `Business number: ${mode.shortcode}`,
    `Account number: ${mode.account_number || 'COUNTER'}`,
    `Amount: ${amountLabel}`,
    'Mark paid after the M-Pesa message arrives',
  ];
}
