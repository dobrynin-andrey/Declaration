"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var address_1 = require("./types/address");
var TouchKeeper = /** @class */ (function () {
    function TouchKeeper(valuesKeeper) {
        var _this = this;
        this.touchAll = function () {
            _this.getTouch = function () { return true; };
        };
        this.touchAllFromPage = function (page) {
            var processTouches = function (questions, id) {
                questions.forEach(function (question) {
                    if (question.type === 'multiple') {
                        _this.valuesKeeper
                            .getMultipleIds(question.code)
                            .forEach(function (multipleId) { return processTouches(question.answers, multipleId); });
                    }
                    else if (question.type === 'address') {
                        for (var key in address_1.AddressModel.create(null)) {
                            _this.setTouch(address_1.AddressModel.getFullCodeName(question, key), id, true);
                        }
                    }
                    else {
                        _this.setTouch(question.code, id, true);
                    }
                });
            };
            processTouches(page.questions, 0);
        };
        this.setTouch = function (code, id, newValue) {
            if (_this.getTouch(code, id) === newValue) {
                return false;
            }
            _this.values[code] = _this.values[code] || {};
            _this.values[code][id] = newValue;
            return true;
        };
        this.getTouch = function (code, id) {
            if (!id) {
                id = 0;
            }
            if (!_this.values[code] || !_this.values[code][id]) {
                return false;
            }
            return _this.values[code][id];
        };
        this.values = {};
        this.valuesKeeper = valuesKeeper;
    }
    return TouchKeeper;
}());
exports.default = TouchKeeper;
