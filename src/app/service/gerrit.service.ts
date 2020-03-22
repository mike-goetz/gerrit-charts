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

export interface CodeContribution {
  commits: GerritChange[];
  reviews: GerritChange[];
}

export interface UserStatistic {
  user: Person;
  projectMap: Map<string, CodeContribution>;
}

export interface GerritChange {
  owner: Person;
  submitter: Person;
  codeReview?: Person;
  project: string;
  branch: string;
  changeId: string;
  status: string;
  created: moment.Moment;
  updated: moment.Moment;
  submitted: moment.Moment;
  insertions: number;
  deletions: number;
  numberOfUnresolvedComments: number;
  gerritId: number;
  labels: Map<string, any>;
}

@Injectable({
  providedIn: 'root'
})
export class GerritService {
  private gerritChanges: { unfiltered: GerritChange[], filtered: GerritChange[] } = {unfiltered: [], filtered: []};
  private userStatisticMap: Map<string, UserStatistic> = new Map<string, UserStatistic>();
  private projectStatisticMap: Map<string, { commits: GerritChange[], contributors: Map<string, Person> }> = new Map<string, { commits: GerritChange[], contributors: Map<string, Person> }>();

  private readonly _filter = new BehaviorSubject<{ numberOfDays: number, summarizeCommits: boolean, projects: string[] }>({
    numberOfDays: 0,
    summarizeCommits: true,
    projects: []
  });
  readonly filter$ = this._filter.asObservable();

  constructor(private masterDataService: MasterDataService) {
    this.filter$.subscribe(value => {
      this.gerritChanges = this.mapGerritData();
      this.calcStaticData();
    });
  }

  public getProjects(): ListOfProjectsEntry[] {
    const map = new Map<string, { commits: number, contributors: Map<string, number> }>();

    this.gerritChanges.unfiltered.filter(item => this.isWithinDateScope(item)).forEach(item => {
      const key = item.project;
      const object = map.has(key) ? map.get(key) : {commits: 0, contributors: new Map<string, number>()};
      object.commits += 1;

      const statistic = object.contributors;
      const username = item.owner.username;
      if (username) {
        statistic.set(username, statistic.has(username) ? statistic.get(username) + 1 : 1);
      }
      if (item.labels.has('Code-Review')) {
        const usernameOfReviewer = item.labels.get('Code-Review').username;
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

  public getPersonData(person: Person, persons: Person[]): GerritAnalyticsData {
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

    const commitsFromTeam = this.gerritChanges.filtered.filter(item => this.isMember(item.owner.username, persons));
    const reviewsFromTeam = this.gerritChanges.filtered.filter(item => item.codeReview ? this.isMember(item.codeReview.username, persons) : false);
    const teamSize = persons.length;
    const averageNumberOfCommitsPerTeamMember = Math.floor(commitsFromTeam.length / teamSize);
    const averageNumberOfReviewsPerTeamMember = Math.floor(reviewsFromTeam.length / teamSize);

    this.gerritChanges.filtered.forEach((item: GerritChange) => {
      const pullRequest = item.owner.username === person.username;
      const review = item.codeReview ? item.codeReview.username !== item.owner.username && item.codeReview.username === person.username : false;
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

  get filter() {
    return this._filter.getValue();
  }

  set filter(val: { numberOfDays: number, summarizeCommits: boolean, projects: string[] }) {
    this._filter.next(val);
  }

  updateDaysFilter(numberOfDays: number) {
    this.filter = {
      ...this._filter.getValue(),
      numberOfDays
    };
  }

  updateProjectsFilter(projects: string[]) {
    this.filter = {
      ...this._filter.getValue(),
      projects
    };
  }

  public getPersonsData(persons: Person[] = []): Map<Person, Map<string, number>> {
    if (persons.length === 0) {
      this.getContributors().forEach(value => persons.push(value.person));
    }

    const map = new Map<Person, Map<string, number>>();
    let dt = moment().subtract(this.filter.numberOfDays - 1, 'days').startOf('day');
    const end = moment().startOf('day');
    persons.forEach(person => {
      const personMap = new Map<string, number>();

      dt = moment().subtract(this.filter.numberOfDays - 1, 'days').startOf('day');
      while (dt <= end) {
        const date = dt.format('YYYY-MM-DD');
        personMap.set(date, 0);
        dt = dt.add(1, 'day');
      }
      map.set(person, personMap);
    });

    this.gerritChanges.filtered.forEach(item => {
      const contributionDate = moment(item.submitted, 'YYYY-MM-DD HH:mm:ss.SSS');
      const person = persons.find(m => m.username === item.owner.username);
      if (person) {
        const personMap = map.get(person);
        const key = contributionDate.format('YYYY-MM-DD');
        const newCountValue = personMap.get(key) + 1;
        personMap.set(key, newCountValue);
      }
    });
    if (this.filter.summarizeCommits) {
      persons.forEach(person => {
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

    this.gerritChanges.filtered.filter(gerritChange => this.isTeamMember(gerritChange.owner.username, team)).forEach(gerritChange => {
      const contributionDate = moment(gerritChange.submitted, 'YYYY-MM-DD HH:mm:ss.SSS');
      const person = team.members.find(m => m.username === gerritChange.owner.username);

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

    this.gerritChanges.filtered.forEach((gerritChange: GerritChange) => {
      const owner = gerritChange.owner;
      const userStatistic = map.has(owner.username) ? map.get(owner.username) : {person: owner, commits: 0, reviews: 0};
      userStatistic.commits = userStatistic.commits + 1;
      map.set(owner.username, userStatistic);

      // exclude reviews done by owner
      if (gerritChange.codeReview !== undefined && owner.username !== gerritChange.codeReview.username) {
        const userStatisticCodeReviewer = map.has(gerritChange.codeReview.username) ? map.get(gerritChange.codeReview.username) : {
          person: gerritChange.codeReview,
          commits: 0,
          reviews: 0
        };
        userStatisticCodeReviewer.reviews = userStatisticCodeReviewer.reviews + 1;
        map.set(gerritChange.codeReview.username, userStatisticCodeReviewer);
      }
    });

    return new Map([...map.entries()].sort((a, b) => (b[1].commits + b[1].reviews) - (a[1].commits + a[1].reviews)));
  }

  getNumberOfCommits() {
    return this.gerritChanges.filtered.length;
  }

  getMostBusyDay() {
    const map = new Map<string, number>();
    this.gerritChanges.filtered.forEach(gerritChange => {
      const submittedDate = moment(gerritChange.submitted, 'YYYY-MM-DD HH:mm:ss.SSS');
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

  private mapGerritData() {
    const mapItem = item => {
      const gerritChange = <GerritChange>{
        owner: item.owner,
        submitter: item.submitter,
        project: item.project,
        branch: item.branch,
        changeId: item.change_id,
        status: item.status,
        created: moment(item.created, 'YYYY-MM-DD HH:mm:ss.SSS'),
        updated: moment(item.updated, 'YYYY-MM-DD HH:mm:ss.SSS'),
        submitted: moment(item.submitted, 'YYYY-MM-DD HH:mm:ss.SSS'),
        insertions: item.insertions,
        deletions: item.deletions,
        numberOfUnresolvedComments: item.unresolved_comment_count,
        gerritId: item._number,
        labels: new Map(Object.entries(item.labels))
      };
      if (gerritChange.labels.has('Code-Review')) {
        gerritChange.codeReview = gerritChange.labels.get('Code-Review').approved;
      }
      return gerritChange;
    };
    let unfiltered: GerritChange[] = [];
    gerritData.forEach(item => {
      unfiltered.push(mapItem(item));
    });
    unfiltered = unfiltered.sort((a, b) => b.submitted.unix() - a.submitted.unix());
    const filtered: GerritChange[] = [];
    unfiltered.filter(gerritChange => this.isWithinScope(gerritChange)).forEach(gerritChange => {
      filtered.push(gerritChange);
    });

    return {unfiltered, filtered};
  }

  private calcStaticData() {
    this.userStatisticMap.clear();
    this.projectStatisticMap.clear();
    const projectContribution = (user: Person, project: string) => {
      let projectMap;
      if (this.userStatisticMap.has(user.username)) {
        projectMap = this.userStatisticMap.get(user.username).projectMap;
      } else {
        projectMap = new Map<string, CodeContribution>();
        this.userStatisticMap.set(user.username, {user, projectMap});
      }
      let projectContribution;
      if (projectMap.has(project)) {
        projectContribution = projectMap.get(project);
      } else {
        projectContribution = {commits: [], reviews: []};
        projectMap.set(project, projectContribution);
      }
      return projectContribution;
    };

    const pushProjectRelatedChange = (project: string, gerritChange: GerritChange) => {
      let commits;
      if (this.projectStatisticMap.has(project)) {
        commits = this.projectStatisticMap.get(project).commits;
      } else {
        commits = [];
        this.projectStatisticMap.set(project, {commits: commits, contributors: new Map<string, Person>()});
      }
      commits.push(gerritChange);
    };

    const pushProjectContributor = (project: string, user: Person) => {
      let contributors;
      if (this.projectStatisticMap.has(project)) {
        contributors = this.projectStatisticMap.get(project).contributors;
      } else {
        contributors = new Map<string, Person>();
        this.projectStatisticMap.set(project, {commits: [], contributors});
      }
      if (!contributors.has(user.username)) {
        contributors.set(user.username, user);
      }
    };

    this.gerritChanges.filtered.forEach(gerritChange => {
      const changeOwner = gerritChange.owner;
      const project = gerritChange.project;
      pushProjectRelatedChange(project, gerritChange);
      pushProjectContributor(project, changeOwner);
      projectContribution(changeOwner, project).commits.push(gerritChange);
      let changeReviewer = gerritChange.codeReview;
      // exclude reviews done by owner
      if (changeReviewer !== undefined && changeOwner.username !== changeReviewer.username) {
        pushProjectContributor(project, changeReviewer);
        projectContribution(changeReviewer, project).reviews.push(gerritChange);
      }
    });

    console.log(this.gerritChanges, this.projectStatisticMap, this.userStatisticMap);
  }

  private isWithinDateScope(item: GerritChange): boolean {
    const dt = moment().subtract(this.filter.numberOfDays - 1, 'days').startOf('day');
    return item.submitted.isBetween(dt, undefined);
  }

  private isWithinScope(item: GerritChange): boolean {
    const projects: string[] = this.filter.projects;
    const dt = moment().subtract(this.filter.numberOfDays - 1, 'days').startOf('day');
    return projects.includes(item.project) && item.submitted.isBetween(dt, undefined);
  }

  private isTeamMember(username: string, team: Team): boolean {
    return this.isMember(username, team.members);
  }

  private isMember(username: string, persons: Person[]): boolean {
    return persons.find(m => m.username === username) !== undefined;
  }
}
