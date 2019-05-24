/**
 * This file prepares data for unit testing
 */

declare global {
    interface Window {
        catalog: Catalog;
        timeMatrix: Int32Array;
        buildingList: string[];
        semesters: SemesterJSON[];
    }
}

/**
 *
 */
import { requestSemesterData } from '@/data/CatalogLoader';
import path from 'path';
import fs from 'fs';
import Catalog, { SemesterJSON } from '@/models/Catalog';

const datadir = path.join(__dirname, 'data');

if (!fs.existsSync(datadir)) {
    fs.mkdirSync(datadir);
}

const semester: SemesterJSON = {
    id: '1198',
    name: 'Fall 2019'
};
const filename = `CS${semester.id}Data.json`;
const filepath = path.join(datadir, filename);

async function getData() {
    let data: Catalog;
    if (fs.existsSync(filepath)) {
        console.info('reading data from local cache...');
        data = Catalog.fromJSON(JSON.parse(fs.readFileSync(filepath).toString()));
    } else {
        console.info('Local cache does not exist. Requesting data from remote..');
        data = await requestSemesterData(semester);

        // cache the data, if possible
        fs.writeFileSync(filepath, JSON.stringify(data));
    }
    return data;
}

export default getData();
