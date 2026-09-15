import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function isDateOnly(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value.startsWith('0000')
  )
    return false;
  const date = new Date(value + 'T00:00:00.000Z');
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function IsDateOnly(options?: ValidationOptions): PropertyDecorator {
  return (object, propertyName) =>
    registerDecorator({
      name: 'isDateOnly',
      target: object.constructor,
      propertyName: String(propertyName),
      options,
      validator: {
        validate: isDateOnly,
        defaultMessage: (args) =>
          `${args?.property} must be a valid date (YYYY-MM-DD)`,
      },
    });
}
export function IsOnOrAfter(
  other: string,
  options?: ValidationOptions,
): PropertyDecorator {
  return (object, propertyName) =>
    registerDecorator({
      name: 'isOnOrAfter',
      target: object.constructor,
      propertyName: String(propertyName),
      constraints: [other],
      options,
      validator: {
        validate(value: unknown, args: ValidationArguments) {
          const earlier = (args.object as Record<string, unknown>)[other];
          return !isDateOnly(value) || !isDateOnly(earlier) || value >= earlier;
        },
        defaultMessage: (args) =>
          `${args?.property} must be on or after ${other}`,
      },
    });
}
