import {Injectable} from '@angular/core';
import moment from 'moment';
import {BehaviorSubject} from 'rxjs';
import gerritData from '../../assets/data/gerritData.json';
import {ContributionChartDataPoint} from '../model/contribution-chart-data-point';
import {GerritAnalyticsData} from '../model/gerrit-analytics-data';
import {Person} from '../model/person';
import {Team} from '../model/team';
import {MasterDataService} from './master-data.service';

export interface ListOfContributorsEntry {
  person: Person;
  teamName: string;
  commits: number;
  reviews: number;
}

export interface ListOfProjectsEntry {
  project: string;
  commits: number;
  contributors: number;
}

@Injectable({
  providedIn: 'root'
})
export class GerritService {

  private readonly _filter = new BehaviorSubject<{ numberOfDays: number, summarizeCommits: boolean, projects: string[] }>({
    numberOfDays: 365,
    summarizeCommits: true,
    projects: ['gerald/*']
  });
  readonly filter$ = this._filter.asObservable();

  constructor(private masterDataService: MasterDataService) {
  }

  get filter() {
    return this._filter.getValue();
  }

  set filter(val: { numberOfDays: number, summarizeCommits: boolean, projects: string[] }) {
    this._filter.next(val);
  }

  updateProjectsFilter(projects: string[]) {
    this.filter = {
      ...this._filter.getValue(),
      projects
    };
  }

  public getProjects(): ListOfProjectsEntry[] {
    const map = new Map<string, { commits: number, contributors: Map<string, number> }>();

    gerritData.forEach(item => {
      const key = item.project;
      const object = map.has(key) ? map.get(key) : {commits: 0, contributors: new Map<string, number>()};
      object.commits += 1;

      const statistic = object.contributors;
      const username = item.owner.username;
      if (username) {
        statistic.set(username, statistic.has(username) ? statistic.get(username) + 1 : 1);
      }
      const codeReviewer = item.labels['Code-Review'].approved;
      const usernameOfReviewer = codeReviewer ? codeReviewer.username : item.submitter ? item.submitter.username : undefined;
      if (usernameOfReviewer) {
        statistic.set(usernameOfReviewer, statistic.has(usernameOfReviewer) ? statistic.get(usernameOfReviewer) + 1 : 1);
      }
      map.set(key, object);
    });

    const sortedMap = new Map([...map.entries()].sort((a, b) => (b[1].commits) - (a[1].commits)));
    const result: ListOfProjectsEntry[] = [];
    sortedMap.forEach((value, project) => {
      result.push({project, commits: value.commits, contributors: value.contributors.size});
    });
    return result;
  }

  public getPersonData(person: Person, team: Team): GerritAnalyticsData {
    const map = new Map<string, ContributionChartDataPoint>();
    let dt = moment().subtract(this.filter.numberOfDays - 1, 'days').startOf('day');
    const end = moment().startOf('day');
    while (dt <= end) {
      const date = dt.format('YYYY-MM-DD');
      map.set(date, {
        x: date,
        y: dt.format('e'),
        date,
        commits: 0,
        reviews: 0,
      });
      dt = dt.add(1, 'day');
    }

    const commitsFromTeam = gerritData.filter(item => {
      return this.isWithinScope(item) && this.isTeamMember(item.owner.username, team);
    });
    const reviewsFromTeam = gerritData.filter(item => {
      const withinScope = this.isWithinScope(item);
      if (!withinScope) {
        return false;
      }
      const codeReviewer = item.labels['Code-Review'].approved;
      const codeReviewerUserName = codeReviewer ? codeReviewer.username : item.submitter.username;
      return this.isTeamMember(codeReviewerUserName, team);
    });
    const teamSize = team.members.filter(m => m.endDate === undefined).length;
    const averageNumberOfCommitsPerTeamMember = Math.floor(commitsFromTeam.length / teamSize);
    const averageNumberOfReviewsPerTeamMember = Math.floor(reviewsFromTeam.length / teamSize);

    gerritData.filter(item => this.isWithinScope(item)).forEach(item => {
      const pullRequest = item.owner.username === person.username;
      const codeReviewer = item.labels['Code-Review'].approved;
      const codeReviewerUserName = codeReviewer ? codeReviewer.username : item.submitter.username;
      const review = codeReviewerUserName === person.username;
      if (pullRequest || review) {
        const contributionDate = moment(item.submitted, 'YYYY-MM-DD HH:mm:ss.SSS');
        const key = contributionDate.format('YYYY-MM-DD');
        const dataPoint: ContributionChartDataPoint = map.get(key);
        if (pullRequest) {
          dataPoint.commits = dataPoint.commits + 1;
        }
        // exclude reviews done by owner
        if (!pullRequest && review) {
          dataPoint.reviews = dataPoint.reviews + 1;
        }
        map.set(key, dataPoint);
      }
    });

    const contributionData: ContributionChartDataPoint[] = [];
    let numberOfCommits = 0;
    let numberOfReviews = 0;
    map.forEach(value => {
      contributionData.push(value);
      numberOfCommits += value.commits;
      numberOfReviews += value.reviews;
    });
    return {
      person,
      contributionData,
      numberOfCommits,
      numberOfReviews,
      numberOfContributions: numberOfCommits + numberOfReviews,
      averageNumberOfCommitsPerTeamMember,
      averageNumberOfReviewsPerTeamMember
    };
  }

  public getTeamData(team: Team): Map<Person, Map<string, number>> {
    const map = new Map<Person, Map<string, number>>();
    let dt = moment().subtract(this.filter.numberOfDays - 1, 'days').startOf('day');
    const end = moment().startOf('day');
    team.members.forEach(person => {
      const personMap = new Map<string, number>();

      dt = moment().subtract(this.filter.numberOfDays - 1, 'days').startOf('day');
      while (dt <= end) {
        const date = dt.format('YYYY-MM-DD');
        personMap.set(date, 0);
        dt = dt.add(1, 'day');
      }
      map.set(person, personMap);
    });

    gerritData.filter(item => this.isWithinScope(item) && this.isTeamMember(item.owner.username, team)).forEach(item => {
      const contributionDate = moment(item.submitted, 'YYYY-MM-DD HH:mm:ss.SSS');
      const person = team.members.find(m => m.username === item.owner.username);

      const personMap = map.get(person);
      const key = contributionDate.format('YYYY-MM-DD');
      const newCountValue = personMap.get(key) + 1;
      personMap.set(key, newCountValue);
    });
    if (this.filter.summarizeCommits) {
      team.members.forEach(person => {
        const personMap = map.get(person);
        dt = moment().subtract(this.filter.numberOfDays - 1, 'days').startOf('day');
        let continuesCommitCount = 0;
        while (dt <= end) {
          const date = dt.format('YYYY-MM-DD');
          continuesCommitCount += personMap.get(date);
          personMap.set(date, continuesCommitCount);
          dt = dt.add(1, 'day');
        }
      });
    }
    return map;
  }

  public getContributors(): Map<string, { person: Person; commits: number; reviews: number; }> {
    const map = new Map<string, { person: Person; commits: number; reviews: number; }>();

    gerritData.filter(item => this.isWithinScope(item)).forEach(item => {
      const owner = item.owner;
      const userStatistic = map.has(owner.username) ? map.get(owner.username) : {person: owner, commits: 0, reviews: 0};
      userStatistic.commits = userStatistic.commits + 1;
      map.set(owner.username, userStatistic);

      let codeReviewer = item.labels['Code-Review'].approved;
      if (codeReviewer === undefined) {
        codeReviewer = item.submitter;
      }
      // exclude reviews done by owner
      if (codeReviewer !== undefined && owner.username !== codeReviewer.username) {
        const userStatistic = map.has(codeReviewer.username) ? map.get(codeReviewer.username) : {person: codeReviewer, commits: 0, reviews: 0};
        userStatistic.reviews = userStatistic.reviews + 1;
        map.set(codeReviewer.username, userStatistic);
      }
    });

    return new Map([...map.entries()].sort((a, b) => (b[1].commits + b[1].reviews) - (a[1].commits + a[1].reviews)));
  }

  getListOfContributors(): ListOfContributorsEntry[] {
    const result = [];
    this.getContributors().forEach(value => {
      const team = this.masterDataService.getTeam(value.person);
      result.push({
        person: value.person,
        teamName: team ? team.name : undefined,
        commits: value.commits,
        reviews: value.reviews
      });
    });
    return result.sort((a, b) => (b.commits + b.reviews) - (a.commits + a.reviews));
  }

  getNumberOfContributors() {
    return this.getContributors().size;
  }

  getNumberOfCommits() {
    return gerritData.filter(item => this.isWithinScope(item)).length;
  }

  getMostBusyDay() {
    const map = new Map<string, number>();
    gerritData.filter(item => this.isWithinScope(item)).forEach(item => {
      const submittedDate = moment(item.submitted, 'YYYY-MM-DD HH:mm:ss.SSS');
      const key = submittedDate.format('YYYY-MM-DD');
      map.set(key, map.has(key) ? map.get(key) + 1 : 1);
    });
    const sortedMap = new Map([...map.entries()].sort((a, b) => (b[1] + b[1]) - (a[1] + a[1])));
    const result = [];
    sortedMap.forEach((value, key) => result.push({
      date: key,
      count: value
    }));
    return result.values().next().value;
  }

  private isWithinScope(item): boolean {
    const projects: string[] = this.filter.projects;
    const dt = moment().subtract(this.filter.numberOfDays - 1, 'days').startOf('day');
    if (projects.length == 1 && projects[0].endsWith('*')) {
      return item.project.startsWith(projects[0].substring(0, projects[0].length - 1)) && moment(item.submitted, 'YYYY-MM-DD HH:mm:ss.SSS').isBetween(dt, undefined);
    }
    return projects.includes(item.project) && moment(item.submitted, 'YYYY-MM-DD HH:mm:ss.SSS').isBetween(dt, undefined);
    // return moment(item.submitted, 'YYYY-MM-DD HH:mm:ss.SSS').isBetween(dt, undefined);
  }

  private isTeamMember(username: string, team: Team): boolean {
    return team.members.find(m => m.username === username) !== undefined;
  }
}
