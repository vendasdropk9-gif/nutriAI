// utils/validator.ts

/**
 * Verifica se um valor está vazio.
 */
export function isEmpty(value: any): boolean {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (typeof value === "string" && value.trim() === "")
  );
}

/**
 * Validação de e-mail.
 */
export function isValidEmail(email: string): boolean {
  const regex =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return regex.test(email);
}

/**
 * Senha forte.
 * Mínimo 8 caracteres
 * 1 letra maiúscula
 * 1 minúscula
 * 1 número
 */
export function isStrongPassword(password: string): boolean {
  const regex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  return regex.test(password);
}

/**
 * Apenas números.
 */
export function onlyNumbers(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * CPF simples.
 */
export function isValidCPF(cpf: string): boolean {
  cpf = onlyNumbers(cpf);

  if (cpf.length !== 11) return false;

  if (/^(\d)\1+$/.test(cpf)) return false;

  return true;
}

/**
 * Telefone brasileiro.
 */
export function isValidPhone(phone: string): boolean {
  phone = onlyNumbers(phone);

  return phone.length >= 10 && phone.length <= 11;
}

/**
 * CNPJ simples.
 */
export function isValidCNPJ(cnpj: string): boolean {
  cnpj = onlyNumbers(cnpj);

  return cnpj.length === 14;
}

/**
 * CEP.
 */
export function isValidCEP(cep: string): boolean {
  cep = onlyNumbers(cep);

  return cep.length === 8;
}

/**
 * URL.
 */
export function isValidURL(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Número positivo.
 */
export function isPositiveNumber(value: number): boolean {
  return typeof value === "number" && value > 0;
}

/**
 * Latitude.
 */
export function isValidLatitude(lat: number): boolean {
  return lat >= -90 && lat <= 90;
}

/**
 * Longitude.
 */
export function isValidLongitude(lng: number): boolean {
  return lng >= -180 && lng <= 180;
}

/**
 * Nota (1 a 5 estrelas)
 */
export function isValidRating(rating: number): boolean {
  return rating >= 1 && rating <= 5;
}

/**
 * Texto mínimo.
 */
export function minLength(
  text: string,
  min: number
): boolean {
  return text.trim().length >= min;
}

/**
 * Texto máximo.
 */
export function maxLength(
  text: string,
  max: number
): boolean {
  return text.trim().length <= max;
}

/**
 * Verifica campos obrigatórios.
 */
export function validateRequired(
  fields: Record<string, any>
): string[] {

  const errors: string[] = [];

  for (const key in fields) {
    if (isEmpty(fields[key])) {
      errors.push(`${key} é obrigatório.`);
    }
  }

  return errors;
}

/**
 * Lança erro caso existam campos obrigatórios faltando.
 */
export function validateOrThrow(
  fields: Record<string, any>
): void {

  const errors = validateRequired(fields);

  if (errors.length) {
    throw new Error(errors.join(" "));
  }
}
import {
    validateOrThrow,
    isValidEmail,
    isStrongPassword
} from "../utils/validator";

validateOrThrow({
    email,
    password,
    name
});

if (!isValidEmail(email)) {
    throw new Error("E-mail inválido.");
}

if (!isStrongPassword(password)) {
    throw new Error(
        "A senha deve conter no mínimo 8 caracteres, uma letra maiúscula, uma minúscula e um número."
    );
}