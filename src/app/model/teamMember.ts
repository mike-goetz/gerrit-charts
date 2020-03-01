import {Person} from './person';

export interface TeamMember extends Person {
  startDate: string;
  endDate?: string;
}
