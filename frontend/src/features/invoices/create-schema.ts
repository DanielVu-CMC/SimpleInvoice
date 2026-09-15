import * as yup from 'yup';
import type { CreateInvoice } from '@/services/api/types';
export function validDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000'))
    return false;
  const parsed = new Date(value + 'T00:00:00Z');
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}
const requiredText = (label: string, length: number) =>
  yup
    .string()
    .trim()
    .required(`${label} is required`)
    .max(length, `${label} is too long`);
const amount = (label: string, decimals = 2) =>
  yup
    .number()
    .typeError(`Enter a valid ${label.toLowerCase()}`)
    .required(`${label} is required`)
    .min(0, `${label} must not be negative`)
    .test(
      'precision',
      `${label} must have at most ${decimals} decimal places`,
      (value) => {
        if (value === undefined || !Number.isFinite(value)) return false;
        const [mantissa, exponent = '0'] = String(value)
          .toLowerCase()
          .split('e');
        const precision = Math.max(
          0,
          (mantissa.split('.')[1]?.length ?? 0) - Number(exponent),
        );
        return precision <= decimals;
      },
    );
export const createSchema: yup.ObjectSchema<CreateInvoice> = yup.object({
  invoiceNumber: requiredText('Invoice number', 80),
  invoiceReference: yup.string().trim().max(200),
  invoiceDate: yup
    .string()
    .required('Invoice date is required')
    .test('date', 'Enter a valid invoice date', validDate),
  dueDate: yup
    .string()
    .required('Due date is required')
    .test('date', 'Enter a valid due date', validDate)
    .test(
      'after-invoice',
      'Due date must be on or after invoice date',
      function (value) {
        return (
          !validDate(value) ||
          !validDate(this.parent.invoiceDate as string) ||
          value! >= this.parent.invoiceDate
        );
      },
    ),
  currency: yup
    .string()
    .required('Currency is required')
    .matches(/^[A-Z]{3}$/, 'Choose a currency'),
  description: yup.string().trim().max(2000),
  customer: yup
    .object({
      fullname: requiredText('Customer name', 200),
      email: requiredText('Customer email', 254).email(
        'Enter a valid customer email',
      ),
      mobileNumber: yup.string().trim().max(50),
      address: yup.string().trim().max(1000),
    })
    .required(),
  item: yup
    .object({
      name: requiredText('Item name', 200),
      quantity: yup
        .number()
        .typeError('Enter a quantity')
        .required('Quantity is required')
        .integer('Quantity must be a whole number')
        .min(1, 'Quantity must be positive')
        .max(1000000),
      rate: amount('Rate')
        .min(0.01, 'Rate must be positive')
        .max(999999999999.99),
    })
    .required(),
  taxPercent: amount('Tax', 4)
    .transform((value, original) =>
      Number.isNaN(value) && (original === '' || Number.isNaN(original))
        ? 10
        : value,
    )
    .default(10)
    .max(9999.9999),
  discount: amount('Discount')
    .transform((value, original) =>
      Number.isNaN(value) && (original === '' || Number.isNaN(original))
        ? 0
        : value,
    )
    .default(0)
    .max(999999999999.99),
});
