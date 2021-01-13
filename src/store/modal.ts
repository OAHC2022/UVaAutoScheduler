/**
 * @module src/store
 * @author Hanzhi Zhou
 */

/**
 *
 */
import { SearchMatch } from '@/models/Catalog';
import { getReleaseNote } from '@/utils';
import 'bootstrap';
import $ from 'jquery';
import Course from '../models/Course';
import Section from '../models/Section';

/**
 * the modal module handles modal triggering
 */
class Modal {
    section: Section | null = null;
    course: Course | null = null;
    url = '';
    match: SearchMatch = [[], new Map()];

    showSectionModal(section: Section) {
        this.section = section;
        $('#section-modal').modal();
    }

    showCourseModal(course: Course, match?: SearchMatch) {
        this.course = course;
        this.match = match || [[], new Map()];
        $('#course-modal').modal();
    }

    showURLModal(url: string) {
        this.url = url;
        $('#url-modal').modal();
    }

    async showReleaseNoteModal() {
        const note = await getReleaseNote();
        $('#release-note-body').html(note);
        $('#versionModal').modal();
    }
}

export default new Modal();
