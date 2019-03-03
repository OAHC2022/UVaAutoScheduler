import csv
import logging
from flask import Flask, render_template, jsonify, request
from new_sis.classAlgo import readData, DICT, getReq
from collections import OrderedDict
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

RECORDS_DICT = OrderedDict()
RECORDS_KEYS = []

ATTR_MAP = {
    0: 'department', 1: 'number', 2: 'section', 3: 'type', 4: 'units', 5: 'instructor', 6: 'days', 7: 'room',
    8: 'title', 9: 'topic', 10: 'status', 11: 'enrollment', 12: 'enrollment_limit', 13: 'wait_list', 14: 'description'
}


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/api/semesters')
def get_semesters():
    semesters = [
        {
            "id": 0,
            "name": "Spring 2019"
        },
        {
            "id": 1,
            "name": "Fall 2018"
        }
    ]
    return jsonify(semesters)


@app.route('/api/classes', methods=['GET', 'POST'])
def get_classes():
    if request.method == "GET":
        semester = request.args.get('semester')
        test = request.args.get('test')
        if semester:
            return jsonify(
                {
                    'meta': {
                        'attr_map': ATTR_MAP
                    },
                    'data': RECORDS_DICT,
                    'keys': RECORDS_KEYS,
                }
            )

        if test:
            return jsonify({
                'meta': {
                    'attr_map': ATTR_MAP
                },
                'data': getReq([
                    "cs2110lecture",
                    "cs2110laboratory",
                    "span2020lecture",
                    "cs2102lecture",
                    "sts1500discussion",
                    "math3354lecture",
                    "sts1500lecture",
                ], 100)
            })
        return "!!!"

    elif request.method == "POST":
        return jsonify({
            'meta': {
                'attr_map': ATTR_MAP
            },
            'data': getReq([
                "CS2110Lecture",
                "CS2110Laboratory",
                "SPAN2020Lecture",
                "CS2102Lecture",
                "STS1500Discussion",
                "MATH3354Lecture",
                "STS1500Lecture",
            ], None)
        })
    return "haha"


@app.route('/<any_text>')
def default_handler(any_text):
    return render_template('errors/404.html')


def to_short():
    for k, v in DICT.items():
        RECORDS_DICT[k] = v[0][:10]
        RECORDS_KEYS.append(k)


if __name__ == "__main__":
    logging.info('Loading data...')
    readData()
    to_short()
    logging.info('Running...')

    app.run(host='0.0.0.0', port=8000, debug=True)