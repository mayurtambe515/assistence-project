export interface Message {
  role: 'user' | 'model' | 'system';
  text: string;
}

export interface SystemStat {
  value: number | string;
  unit?: string;
  isStatic?: boolean;
}

export interface SystemStatusData {
  [key: string]: SystemStat;
}

export interface Reminder {
  id: number;
  text: string;
  dueTime: Date;
}

export interface Contact {
  id: number;
  name: string;
  phone: string;
}

export interface WebSource {
  web: {
    uri: string;
    title: string;
  };
}
