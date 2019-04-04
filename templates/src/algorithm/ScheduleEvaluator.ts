// @ts-check
import Schedule from '../models/Schedule';
// eslint-disable-next-line
import { RawAlgoSchedule, RawAlgoCourse, SortOptions } from './ScheduleGenerator';

interface ComparableSchedule {
    schedule: RawAlgoSchedule;
    coeff: number;
}

class ScheduleEvaluator {
    public static days = ['Mo', 'Tu', 'We', 'Th', 'Fr'];

    public static optionDefaults: SortOptions = {
        sortBy: {
            variance: true,
            compactness: false,
            lunchTime: false,
            IamFeelingLucky: false
        },
        reverseSort: false
    };
    public static sortFunctions: { [x: string]: (schedule: RawAlgoSchedule) => number } = {
        /**
         * compute the standard deviation of class times
         */
        variance(schedule: RawAlgoSchedule) {
            const minutes = new Array(5).fill(0);
            const days = ScheduleEvaluator.days;
            for (const course of schedule) {
                for (let i = 0; i < days.length; i++) {
                    if (course[1].includes(days[i])) minutes[i] += course[2][1] - course[2][0];
                }
            }
            return ScheduleEvaluator.std(minutes);
        },

        /**
         * compute the vertical compactness of a schedule,
         * defined as the total time in between each pair of consecutive classes
         */
        compactness(schedule: RawAlgoSchedule) {
            const groups = ScheduleEvaluator.groupCourses(schedule);
            let dist = 0;
            for (const group of groups) {
                for (let i = 0; i < group.length - 1; i++) {
                    // start time of next class minus end time of previous class
                    dist += group[i + 1][2][0] - group[i][2][1];
                }
            }
            return dist;
        },

        /**
         * compute overlap of the classes and the lunch time,
         * defined as the time between 11:00 and 14:00
         */
        lunchTime(schedule: RawAlgoSchedule) {
            // 11:00 to 14:00
            const lunchStart = 11 * 60;
            const lunchEnd = 14 * 60;
            let overlap = 0;
            for (const course of schedule) {
                overlap += ScheduleEvaluator.calcOverlap(
                    lunchStart,
                    lunchEnd,
                    course[2][0],
                    course[2][1]
                );
            }
            return overlap;
        },

        IamFeelingLucky() {
            return Math.random();
        }
    };

    /**
     * calculate the population variance
     */
    public static std(args: number[]) {
        let sum = 0;
        let sumSq = 0;
        for (let i = 0; i < args.length; i++) {
            sum += args[i];
        }
        const mean = sum / args.length;
        for (let i = 0; i < args.length; i++) {
            sumSq += Math.abs(args[i] - mean);
        }
        return sumSq;
    }

    public static calcOverlap(a: number, b: number, c: number, d: number) {
        if (a <= c && d <= b) return d - c;
        if (a <= c && c <= b) return b - c;
        else if (a <= d && d <= b) return d - a;
        else if (a >= c && b <= d) return b - a;
        else return 0;
    }

    public static groupCourses(schedule: RawAlgoSchedule) {
        const groups: RawAlgoSchedule[] = [];
        const days = ScheduleEvaluator.days;
        for (let i = 0; i < days.length; i++) groups.push([]);
        for (const course of schedule) {
            for (let i = 0; i < days.length; i++) {
                if (course[1].includes(days[i])) groups[i].push(course);
            }
        }
        /**
         * Sort according to their start time
         */
        const comparator = (s1: RawAlgoCourse, s2: RawAlgoCourse) => s1[2][0] - s2[2][0];
        for (const group of groups) {
            group.sort(comparator);
        }
        return groups;
    }

    public static validateOptions(options: SortOptions) {
        if (!options) return ScheduleEvaluator.optionDefaults;
        for (const key in options.sortBy) {
            if (typeof ScheduleEvaluator.sortFunctions[key] !== 'function')
                throw new Error('Non-existent sorting option');
        }
        return options;
    }

    public schedules: ComparableSchedule[];
    public options: SortOptions;

    constructor(options: SortOptions) {
        this.schedules = [];
        this.options = ScheduleEvaluator.validateOptions(options);
    }

    /**
     * Add a schedule to the collection of results. Compute its coefficient of quality.
     */
    public add(schedule: RawAlgoSchedule) {
        this.schedules.push({
            schedule: schedule.concat(),
            coeff: 0
        });
    }

    public computeCoeff() {
        if (this.options.sortBy.IamFeelingLucky) {
            for (const cmpSchedule of this.schedules) {
                cmpSchedule.coeff = Math.random();
            }
            return;
        }
        let count = 0;
        let lastKey: string = '';
        for (const key in this.options.sortBy) {
            if (this.options.sortBy[key]) {
                count++;
                lastKey = key;
            }
        }
        if (count === 1) {
            const evalFunc = ScheduleEvaluator.sortFunctions[lastKey];
            for (const cmpSchedule of this.schedules) {
                cmpSchedule.coeff = evalFunc(cmpSchedule.schedule);
            }
            return;
        }
        count = 0;

        console.time('normalizing coefficients');
        const coeffs: number[] = new Array(this.schedules.length);
        const schedules = this.schedules;
        for (const key in this.options.sortBy) {
            if (this.options.sortBy[key]) {
                const coeff = new Array(schedules.length);
                const evalFunc = ScheduleEvaluator.sortFunctions[key];
                let max = 0;
                for (let i = 0; i < schedules.length; i++) {
                    const val = evalFunc(schedules[i].schedule);
                    if (val > max) max = val;
                    coeff[i] = val;
                }
                const normalizeRatio = max / 64;
                if (count) {
                    for (let i = 0; i < coeffs.length; i++) {
                        coeffs[i] += (coeff[i] / normalizeRatio) ** 2;
                    }
                } else {
                    for (let i = 0; i < coeffs.length; i++) {
                        coeffs[i] = (coeff[i] / normalizeRatio) ** 2;
                    }
                }
                count++;
            }
        }
        for (let i = 0; i < schedules.length; i++) schedules[i].coeff = coeffs[i];
        console.timeEnd('normalizing coefficients');
    }

    /**
     * sort the array of schedules according to their quality coefficients computed using the given
     */
    public sort() {
        console.time('sorting: ');
        let cmpFunc: (a: ComparableSchedule, b: ComparableSchedule) => number;
        if (this.options.reverseSort) cmpFunc = (a, b) => b.coeff - a.coeff;
        else cmpFunc = (a, b) => a.coeff - b.coeff;
        // if want to be really fast, use Floyd–Rivest algorithm to select first,
        // say, 100 elements and then sort only these elements
        this.schedules.sort(cmpFunc);
        console.timeEnd('sorting: ');
    }

    /**
     * change the sorting method and (optionally) do sorting
     */
    public changeSort(options: SortOptions, doSort = true) {
        this.options = ScheduleEvaluator.validateOptions(options);
        this.computeCoeff();
        if (doSort) this.sort();
    }

    public size() {
        return this.schedules.length;
    }

    public getRaw(idx: number) {
        const raw_schedule: import('../models/Schedule').RawSchedule = [];
        for (const raw_course of this.schedules[idx].schedule) {
            raw_schedule.push([raw_course[0], raw_course[3], -1]);
        }
        return raw_schedule;
    }
    /**
     * Get a `Schedule` object at idx
     */
    public getSchedule(idx: number) {
        return new Schedule(this.getRaw(idx), 'Schedule', idx + 1);
    }
    /**
     * whether this evaluator contains an empty array of schedules
     */
    public empty() {
        return this.schedules.length === 0;
    }

    public clear() {
        this.schedules = [];
    }
}
export default ScheduleEvaluator;
