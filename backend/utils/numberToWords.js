/**
 * Converts a numeric amount to Indian currency in words format.
 * Example: 21000 -> "Indian Rupee Twenty-One Thousand Only"
 */

const ones = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const tens = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertTwoDigits(n) {
  if (n < 20) return ones[n];
  const tenDigit = Math.floor(n / 10);
  const unitDigit = n % 10;
  return unitDigit ? `${tens[tenDigit]}-${ones[unitDigit]}` : tens[tenDigit];
}

function convertThreeDigits(n) {
  let str = '';
  const hundredDigit = Math.floor(n / 100);
  const remainder = n % 100;

  if (hundredDigit) {
    str += `${ones[hundredDigit]} Hundred`;
    if (remainder) str += ' and ';
  }
  if (remainder) {
    str += convertTwoDigits(remainder);
  }
  return str;
}

function convertIntegerToIndianWords(num) {
  if (num === 0) return 'Zero';

  const crore = Math.floor(num / 10000000);
  num %= 10000000;

  const lakh = Math.floor(num / 100000);
  num %= 100000;

  const thousand = Math.floor(num / 1000);
  num %= 1000;

  const remainder = num;

  const parts = [];

  if (crore > 0) {
    parts.push(`${convertIntegerToIndianWords(crore)} Crore`);
  }
  if (lakh > 0) {
    parts.push(`${convertTwoDigits(lakh)} Lakh`);
  }
  if (thousand > 0) {
    parts.push(`${convertTwoDigits(thousand)} Thousand`);
  }
  if (remainder > 0) {
    parts.push(convertThreeDigits(remainder));
  }

  return parts.join(' ');
}

function numberToIndianWords(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return 'Indian Rupee Zero Only';
  }

  const num = Math.abs(Number(amount));
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  const rupeesWords = convertIntegerToIndianWords(integerPart);

  let result = `Indian Rupee ${rupeesWords}`;

  if (decimalPart > 0) {
    const paiseWords = convertTwoDigits(decimalPart);
    result += ` and Paise ${paiseWords}`;
  }

  result += ' Only';
  return result;
}

module.exports = {
  numberToIndianWords
};
