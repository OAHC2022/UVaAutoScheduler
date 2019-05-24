import Store from '../store';
import { Component, Mixins } from 'vue-property-decorator';
@Component
export default class CourseModal extends Mixins(Store) {
    get course() {
        return this.modal.modalCourse;
    }
}