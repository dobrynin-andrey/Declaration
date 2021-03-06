"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var getHidedElementCodes_1 = require("./getHidedElementCodes");
var getActionedQuestions = function (action) { return function (questions, getValue, getNeedHideValue, id) {
    var myGetValue = function (code) { return getValue(code, id); };
    var myGetNeedHide = function (question) { return getNeedHideValue(question, id); };
    var hidedQuestions = getHidedElementCodes_1.getHidedElementCodes(questions, myGetValue, myGetNeedHide, action);
    return questions.filter(function (question) { return !hidedQuestions.includes(question.code); });
}; };
exports.getVisibleQuestions = getActionedQuestions('show_inputs');
exports.getRequiredQuestions = getActionedQuestions('enable_required');
