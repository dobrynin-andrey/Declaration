import { FullyLoadedDeclaration, MultipleQuestion, Page, Question, SingleQuestion, Values } from './types/declaration';
export interface DataProvider {
    saveAnswer: (questionCode: string, id: number, value: string) => void;
    deleteMultiple: (questionCode: string, id: number) => void;
    copyMultiple: (questionCode: string, id: number, newId: number) => void;
}
export interface SingleQuestionProps {
    question: SingleQuestion;
    value: string;
    setValue: (newValue: string) => void;
    errors: string[];
    setTouched: () => void;
    declaration: Declaration;
    setCourseInputVisibility: (needHideInput: boolean) => boolean;
}
export interface MultipleQuestionProps {
    question: MultipleQuestion;
    ids: number[];
    getQuestionProps: (question: Question, id: number) => QuestionProps;
    addMultiple: (questionCode: string, timestamp: number) => void;
    deleteMultiple: (questionCode: string, id: number) => void;
    copyMultiple: (questionCode: string, id: number) => void;
    filterMultipleChilds: (question: MultipleQuestion, id: number) => SingleQuestion[];
}
export declare type QuestionProps = SingleQuestionProps | MultipleQuestionProps;
export default class Declaration {
    private schema;
    private valuesKeeper;
    private pagesKeeper;
    private dataProvider;
    private validateKeeper;
    isActiveTab: (tab: string) => boolean;
    isActivePage: (page: Page) => boolean;
    getActiveTab: () => string;
    getActivePage: () => Page;
    getVisibleTabs: () => string[];
    getVisiblePages: () => Page[];
    private rerenderCallback?;
    private questionsMap;
    private visibilityKeeper;
    validatePage: (page: Page) => string[];
    private touchKeeper;
    getMultipleIds: (code: string) => number[];
    constructor(schema: FullyLoadedDeclaration, initialValues: Values, dataProvider: DataProvider);
    processShowInputsActions: (schema: FullyLoadedDeclaration) => void;
    calculateQuestionsMap: (schema: FullyLoadedDeclaration) => {};
    setRerenderCallback: (cb: () => void) => void;
    getVisibleQuestionFromPage: (page: Page) => Question[];
    setActivePage: (page: Page) => void;
    setActiveTab: (tab: string) => void;
    filterMutlipleQuestionChilds: (multipleQuestion: MultipleQuestion, id: number) => SingleQuestion[];
    getDefaultMutlipleQuestion: (page: Page) => import("./types/declaration").TextQuestion | import("./types/declaration").AutocompleteQuestion | import("./types/declaration").CurrencyAutocompleteQuestion | import("./types/declaration").AddressQuestion | import("./types/declaration").InfoQuestion | import("./types/declaration").DateQuestion | import("./types/declaration").PhoneQuestion | MultipleQuestion | import("./types/declaration").NumberQuestion | import("./types/declaration").RadioQuestion | import("./types/declaration").SelectQuestion | import("./types/declaration").CheckboxQuestion | import("./types/declaration").MoneyQuestion | import("./types/declaration").MoneyIntegerQuestion | import("./types/declaration").SharesQuestion | undefined;
    isPageEmpty: (page: Page) => boolean;
    getQuestionProps: (question: Question, id: number) => QuestionProps;
}
