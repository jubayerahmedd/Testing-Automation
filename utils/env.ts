import dotenv from 'dotenv';
dotenv.config({ quiet: true });

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}. Copy .env.example to .env and fill it in.`);
  return v;
}

export const env = {
  baseUrl: process.env.BASE_URL ?? 'https://jubayer.comm.pro.bd',
  get email() { return required('USER_EMAIL'); },
  get password() { return required('USER_PASSWORD'); },
  get memberEmail() { return required('MEMBER_EMAIL'); },
  get memberPassword() { return required('MEMBER_PASSWORD'); },
};
