export interface BankAccount {
  name: string;
  accountNo: string;
  holder: string;
}

export const BANK_ACCOUNTS: Record<string, BankAccount> = {
  BCA: { name: 'Bank BCA', accountNo: '8820-9912-3401', holder: 'PT E.PAPER JEWELLERY GOLD' },
  Mandiri: { name: 'Bank Mandiri', accountNo: '137-00-1928374-1', holder: 'PT E.PAPER JEWELLERY GOLD' },
  BRI: { name: 'Bank BRI', accountNo: '0206-01-002819-30-2', holder: 'PT E.PAPER JEWELLERY GOLD' },
  BNI: { name: 'Bank BNI', accountNo: '088-291-8823', holder: 'PT E.PAPER JEWELLERY GOLD' },
};

export type BankKey = keyof typeof BANK_ACCOUNTS;
