// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
export type ValidationRule = (value: string | number) => boolean | string
// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
export type RegisterFormElement = (payload: { validate: () => boolean; name: string }) => void
