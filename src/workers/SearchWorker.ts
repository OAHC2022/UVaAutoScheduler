/**
 * Search worker is used to perform fuzzy search (which is very expensive)
 * in a separate, non-blocking process.
 * @author Kaiying Shan, Hanzhi Zhou
 * @module src/workers
 * @preferred
 */

/**
 *
 */
import { RawAlgoCourse } from '@/algorithm/ScheduleGenerator';
import { SearchMatch } from '@/models/Catalog';
import _Course, { CourseMatch, Match } from '../models/Course';
import { SectionFields, SectionMatch } from '../models/Section';
import { calcOverlap } from '@/utils/time';
import { FastSearcherNative, SearchResult } from '@/algorithm/Searcher';

type Section = Omit<SectionFields, 'course'>;
type Course = Omit<NonFunctionProperties<_Course>, 'sections'>;

declare function postMessage(msg: [string, [RawAlgoCourse[], SearchMatch[]]] | 'ready'): void;

let titleSearcher: FastSearcherNative<Course>;
let descriptionSearcher: FastSearcherNative<Course>;
let topicSearcher: FastSearcherNative<Section>;
let instrSearcher: FastSearcherNative<Section>;

type CourseResultMap = Map<string, SearchResult<Course, string>[]>;
type SectionResultMap = Map<string, Map<number, SearchResult<Section, string>[]>>;
/**
 * elements in array:
 * 1. score for courses,
 * 2. score for sections,
 * 3. number of distinct sections
 */
type ScoreEntry = [number, number, number];
type Scores = Map<string, ScoreEntry>;

const courseMap: CourseResultMap = new Map();
const sectionMap: SectionResultMap = new Map();
const scores: Scores = new Map();

let courses: Course[];
let sections: Section[];

function processCourseResults(results: SearchResult<Course, string>[], weight: number) {
    for (const result of results) {
        const { key } = courses[result.index];
        const score = result.score ** 2 * weight;

        const temp = courseMap.get(key);
        if (temp) {
            scores.get(key)![0] += score;
            temp.push(result);
        } else {
            // if encounter this course for the first time
            scores.set(key, [score, 0, 0]);
            courseMap.set(key, [result]);
        }
    }
}

function processSectionResults(results: SearchResult<Section, string>[], weight: number) {
    for (const result of results) {
        const { key, id } = sections[result.index];
        const score = result.score ** 2 * weight;

        let scoreEntry = scores.get(key);
        if (!scoreEntry) {
            scoreEntry = [0, 0, 0];
            scores.set(key, scoreEntry);
        }
        scoreEntry[1] += score;

        const secMatches = sectionMap.get(key);
        if (secMatches) {
            const matches = secMatches.get(id);
            if (matches) {
                matches.push(result);
            } else {
                secMatches.set(id, [result]);
                // if encounter a new section of a course, increment the number of section recorded
                scoreEntry[2] += 1;
            }
        } else {
            sectionMap.set(key, new Map().set(id, [result]));
            scoreEntry[2] += 1;
        }
    }
}

function toMatches(matches: SearchResult<any, any>[]) {
    const allMatches: Match<any>[] = [];
    for (const { data, matches: m } of matches) {
        for (let i = 0; i < m.length; i += 2) {
            allMatches.push({
                match: data as any,
                start: m[i],
                end: m[i + 1]
            });
        }
    }
    return allMatches;
}

/**
 * initialize the worker using `msg.data` which is assumed to be a `courseDict` on the first message,
 * posting the string literal 'ready' as the response
 *
 * start fuzzy search using `msg.data` which is assumed to be a string for the following messages,
 * posting the array of tuples (used to construct [[Course]] instances) as the response
 */
onmessage = ({ data }: { data: [Course[], Section[]] | string }) => {
    // initialize the searchers and store them
    if (typeof data !== 'string') {
        console.time('worker prep');
        [courses, sections] = data;

        titleSearcher = new FastSearcherNative(courses, obj => obj.title, 'title');
        descriptionSearcher = new FastSearcherNative(
            courses,
            obj => obj.description,
            'description'
        );
        topicSearcher = new FastSearcherNative(sections, obj => obj.topic, 'topic');
        instrSearcher = new FastSearcherNative(
            sections,
            obj => obj.instructors.join(' '),
            'instructors'
        );

        postMessage('ready');
        console.timeEnd('worker prep');
    } else {
        const query = data;

        console.time('search');
        processCourseResults(titleSearcher.sWSearch(query), 1);
        processCourseResults(descriptionSearcher.sWSearch(query), 0.5);
        processSectionResults(topicSearcher.sWSearch(query), 0.9);
        processSectionResults(instrSearcher.sWSearch(query), 0.25);
        console.timeEnd('search');
        // processCourseResults(titleSearcher.sWSearch(query, 2), 1);
        // processCourseResults(descriptionSearcher.sWSearch(query, 2), 0.5);
        // processSectionResults(topicSearcher.sWSearch(query, 2), 0.9);
        // processSectionResults(instrSearcher.sWSearch(query, 2), 0.25);

        // sort courses in descending order; section score is normalized before added to course score
        const scoreEntries = Array.from(scores)
            .sort(
                (a, b) =>
                    b[1][0] -
                    a[1][0] +
                    (b[1][2] && b[1][1] / b[1][2]) -
                    (a[1][2] && a[1][1] / a[1][2])
            )
            .slice(0, 12);
        // console.log(scoreEntries);

        const finalResults: RawAlgoCourse[] = [];
        const allMatches: SearchMatch[] = [];

        // merge course and section matches
        for (const [key] of scoreEntries) {
            const courseMatch = courseMap.get(key);
            const secMatches = new Map<number, SectionMatch[]>();

            // record section matches
            const s = sectionMap.get(key);
            if (s) for (const [id, matches] of s) secMatches.set(id, toMatches(matches));

            if (courseMatch) {
                const crsMatches: CourseMatch[] = toMatches(courseMatch);
                finalResults.push([key, courseMatch[0].item.ids]);
                allMatches.push([crsMatches, secMatches]);
            } else {
                // only section match exists
                finalResults.push([key, [...secMatches.keys()]]);
                allMatches.push([[], secMatches]);
            }
        }
        // console.log(finalResults, allMatches);
        postMessage([query, [finalResults, allMatches]]);

        courseMap.clear();
        sectionMap.clear();
        scores.clear();
    }
};
