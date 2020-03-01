import {Injectable} from '@angular/core';
import teams from '../../assets/data/teams.json';
import {Person} from "../model/person";
import {Team} from '../model/team';

@Injectable({
  providedIn: 'root'
})
export class MasterDataService {

  constructor() {
  }

  public getTeam(person: Person) {
    return teams.filter(t => Array.from(t.members).map(m => m.username).includes(person.username)).shift();
  }

  public getTeams(contributors: Map<string, { person: Person; commits: number; reviews: number; }>): Team[] {

    const teamMap = new Map<string, Team>();
    teams.forEach(t => {
      teamMap.set(t.name, {name: t.name, members: []});
    });

    contributors.forEach((value, username) => {
      const team = this.getTeam(value.person);
      if (team) {
        const teamMember = Array.from(team.members).find(m => m.username === username);
        teamMap.get(team.name).members.push(teamMember);
      }
    });

    return Array.from(teamMap.values());
  }
}
