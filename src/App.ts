/**
 * the "view" of this project; the root Vue component that contains almost all of the child components and DOM
 * elements of the main webpage.
 * @author Hanzhi Zhou, Kaiying Shan, Elena Long
 */

/**
 *
 */
import { Component } from 'vue-property-decorator';
import ClassView from './components/tabs/ClassView.vue';
import DisplayView from './components/tabs/DisplayView.vue';
import EventView from './components/tabs/EventView.vue';
import ExportView from './components/tabs/ExportView.vue';
import External from './components/tabs/External.vue';
import FilterView from './components/tabs/FilterView.vue';
import GridSchedule from './components/GridSchedule.vue';
import PaletteView from './components/tabs/PaletteView.vue';

import Pagination from './components/Pagination.vue';
import CourseModal from './components/CourseModal.vue';
import SectionModal from './components/SectionModal.vue';

import { loadBuildingList, loadTimeMatrix } from './data/BuildingLoader';
import Store from './store';

@Component({
    components: {
        ClassView,
        EventView,
        DisplayView,
        FilterView,
        PaletteView,
        ExportView,
        Pagination,
        GridSchedule,
        SectionModal,
        CourseModal,
        Information: () => import('./components/tabs/Information.vue'),
        External
    }
})
export default class App extends Store {
    get sideBar() {
        return this.status.sideBar;
    }
    get scheduleWidth() {
        return this.status.sideBarActive ? 100 - 19 - 3 - 3 : 100 - 3 - 3;
    }
    get scheduleLeft() {
        return this.status.sideBarActive ? 23 : 3;
    }

    mobile = window.screen.width < 900;
    sideBarWidth = this.mobile ? 10 : 3;
    scrollable = false;

    created() {
        this.status.loading = true;

        (async () => {
            // note: these three can be executed in parallel, i.e. they are not inter-dependent
            const [pay1, pay2, pay3] = await Promise.all([
                loadTimeMatrix(),
                loadBuildingList(),
                this.semester.loadSemesters()
            ]);
            console[pay1.level](pay1.msg);
            if (pay1.payload) window.timeMatrix = pay1.payload;

            console[pay2.level](pay2.msg);
            if (pay2.payload) window.buildingList = pay2.payload;

            if (pay3.level !== 'info') this.noti.notify(pay3);
            if (pay3) await this.selectSemester(this.semester.semesters[0]);
            this.status.loading = false;
        })();
    }
}
