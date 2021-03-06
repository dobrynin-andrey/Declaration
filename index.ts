import {
  canHasActionsOnChild,
  hasActions,
  hasActionsOnChild,
  isAutocompleteWithActions,
  hasForceValueAction,
} from './getHidedElementCodes'
import PageKeeper from './page-keeper'
import TouchKeeper from './touch-keeper'
import {
  FullyLoadedDeclaration,
  MultipleQuestion,
  Page,
  Question,
  SingleQuestion,
  Values,
  AddressQuestion,
  CheckboxQuestion,
  ForceValuesAction,
  QuestionHasAction,
} from './types/declaration'
import { Address, AddressModel } from './types/address'
import ValidateKeeper from './validate-keeper'
import ValuesKeeper from './values-keeper'
import { VisibilityKeeper } from './visibility-keeper'

type QuestionsMap = { [key: string]: Question }

export interface Statistics {
  incomes: Array<{
    name: string
    value: number
  }>
  deductions: Array<{
    name: string
    value: number
  }>
  payments_or_compensations: [{ to: number; from: number }]
}

export interface DataProvider {
  saveAnswer: (questionCode: string, id: number, value: string) => void
  deleteMultiple: (questionCode: string, id: number) => void
  copyMultiple: (questionCode: string, id: number, newId: number) => void
  getStatistics: () => Promise<Statistics>
}

export interface SingleQuestionProps {
  question: SingleQuestion
  value: string
  setActive: () => void
  setValue: (newValue: string) => void
  errors: string[]
  setTouched: () => void
  declaration: Declaration
  setAutocompleteActionIndex: (value: string) => boolean
}

export interface AddressQuestionProps {
  question: AddressQuestion
  value: string
  setValue: (newValue: string) => void
  errors: { [key in keyof Address]: string[] }
  setTouched: (name: keyof Address) => void
  declaration: Declaration
}

export interface MultipleQuestionProps {
  question: MultipleQuestion
  ids: number[]
  getTitle: (id: number) => string | undefined
  getQuestionProps: (question: Question, id: number) => QuestionProps
  addMultiple: (questionCode: string, timestamp: number) => void
  deleteMultiple: (questionCode: string, id: number) => void
  copyMultiple: (questionCode: string, id: number) => void
  filterMultipleChilds: (
    question: MultipleQuestion,
    id: number
  ) => SingleQuestion[]
}

export type QuestionProps =
  | AddressQuestionProps
  | SingleQuestionProps
  | MultipleQuestionProps

export default class Declaration {
  private schema: FullyLoadedDeclaration
  private valuesKeeper: ValuesKeeper
  private pagesKeeper: PageKeeper
  private dataProvider: DataProvider
  private validateKeeper: ValidateKeeper

  isActiveTab: (tab: string) => boolean
  isActivePage: (page: Page) => boolean
  getActiveTab: () => string
  getActivePage: () => Page
  getVisibleTabs: () => string[]
  getVisiblePages: () => Page[]

  private rerenderCallback?: () => void
  private questionsMap: QuestionsMap
  private visibilityKeeper: VisibilityKeeper
  validatePage: (page: Page, checkTouch?: boolean) => string[]
  private touchKeeper: TouchKeeper
  getMultipleIds: (code: string) => number[]
  getTitlePage: (tab: string) => Page | undefined
  getActiveQuestion: () => Question | undefined

  private statistics: Statistics | undefined
  public getStatistics = () => this.statistics
  public loadStatistics = () =>
    this.dataProvider.getStatistics().then(data => {
      this.statistics = data
      this.pagesKeeper.processStatistics(data)
      this.rerenderCallback && this.rerenderCallback()
    })

  canGoToNextPage: () => boolean
  canGoToPrevPage: () => boolean
  goToNextPage: () => void = () => {
    const page = this.pagesKeeper.getNextPage()
    if (undefined === page) {
      return
    }
    this.setActivePage(page)
  }

  goToPrevPage: () => void = () => {
    const page = this.pagesKeeper.getPrevPage()
    if (undefined === page) {
      return
    }
    this.setActivePage(page)
  }

  getPages = () => this.pagesKeeper.pages
  touchAll: () => void

  constructor(
    schema: FullyLoadedDeclaration,
    initialValues: Values,
    dataProvider: DataProvider
  ) {
    this.schema = schema
    this.dataProvider = dataProvider
    this.questionsMap = this.calculateQuestionsMap(schema)
    this.processShowInputsActions(this.schema)
    const questionsWithForceValuesAction = Object.keys(
      this.questionsMap
    ).reduce(
      (tot, cur) => {
        const question = this.questionsMap[cur]
        if (question.type === 'radio' && question.action) {
          tot[cur] = question as QuestionHasAction<ForceValuesAction>
        }
        return tot
      },
      {} as { [key: string]: QuestionHasAction<ForceValuesAction> }
    )
    this.valuesKeeper = new ValuesKeeper(
      initialValues,
      dataProvider,
      questionsWithForceValuesAction
    )
    this.visibilityKeeper = new VisibilityKeeper(
      this.valuesKeeper,
      questionsWithForceValuesAction
    )
    this.pagesKeeper = new PageKeeper(schema, this.valuesKeeper.getValue)
    this.touchKeeper = new TouchKeeper(this.valuesKeeper)
    this.validateKeeper = new ValidateKeeper(
      this.valuesKeeper,
      this.touchKeeper,
      this.visibilityKeeper
    )

    this.touchAll = () => {
      this.touchKeeper.touchAll()
      this.validateKeeper.refreshQuestionCache(null as any, 0)
      this.rerenderCallback && this.rerenderCallback()
    }

    this.canGoToNextPage = this.pagesKeeper.canGoToNextPage
    this.canGoToPrevPage = this.pagesKeeper.canGoToPrevPage

    this.isActiveTab = this.pagesKeeper.isActiveTab
    this.isActivePage = this.pagesKeeper.isActivePage
    this.getTitlePage = this.pagesKeeper.getTitlePage

    this.getActiveTab = this.pagesKeeper.getActiveTab
    this.getActivePage = this.pagesKeeper.getActivePage
    this.getActiveQuestion = this.pagesKeeper.getActiveQuestion

    this.getVisibleTabs = () => this.pagesKeeper.tabs
    this.getVisiblePages = () => this.pagesKeeper.visiblePages
    this.getMultipleIds = this.valuesKeeper.getMultipleIds

    this.validatePage = this.validateKeeper.validatePage
    this.calculateProgress()
  }

  processShowInputsActions = (schema: FullyLoadedDeclaration) => {
    const parseActions = (item: any) => {
      if (item.action && item.action.type === 'show_inputs') {
        const nonProcessedCodes: string[] = [...item.action.codes]
        const codes = []
        while (nonProcessedCodes.length) {
          const curCode = nonProcessedCodes.pop() as string
          if (!this.questionsMap[curCode]) {
            // Не нашли вопрос
            continue
          }
          codes.push(curCode)
          const curQuestion = this.questionsMap[curCode] as any
          if (canHasActionsOnChild(curQuestion)) {
            curQuestion.answers.forEach(answer => {
              if (answer.action && answer.action.type === 'show_inputs') {
                nonProcessedCodes.push(...answer.action.codes)
              }
            })
          }
        }
        item.action.codes = codes
      }
      if (item.answers) {
        item.answers.forEach((answer: any) => {
          parseActions(answer)
        })
      }
    }

    schema.pages.forEach(page => {
      page.questions.forEach(parseActions)
    })
  }

  private calculateProgress = () => {
    const questions = this.getVisiblePages()
      .filter(item => item.type !== 'statement')
      .filter(item => item.type !== 'total')
      .filter(item => item.type !== 'files')
      .flatMap(item => this.getVisibleQuestionFromPage(item))
      .reduce(
        (tot, item) => {
          const questionProps = this.getQuestionProps(item, 0)
          if (questionProps.question.type === 'multiple') {
            const props = questionProps as MultipleQuestionProps
            return tot.concat(
              props.ids.flatMap(id =>
                props
                  .filterMultipleChilds(props.question, id)
                  .map(
                    question =>
                      props.getQuestionProps(
                        question,
                        id
                      ) as SingleQuestionProps
                  )
              )
            )
          }
          return tot.concat([questionProps as any])
        },
        [] as SingleQuestionProps[]
      )
      .filter(item => {
        if (
          item.question.type === 'info' ||
          item.question.type === 'checkbox'
        ) {
          return false
        }
        if (
          item.value === '' &&
          item.question.validation &&
          item.question.validation.canBeSkipped
        ) {
          return false
        }
        return true
      })
    const answeredQuestions = questions.filter(questionProps => {
      if (questionProps.question.type === 'address') {
        return (
          Object.values(
            AddressModel.validate(
              questionProps.value,
              () => true,
              !!questionProps.question.validation &&
                !!questionProps.question.validation.shortAnswer,
              true
            )
          ).flat().length == 0
        )
      }
      return (
        questionProps.value !== '' &&
        0 === (questionProps as SingleQuestionProps).errors.length
      )
    })
    this.progress = Math.floor(
      (answeredQuestions.length * 100) / questions.length
    )
  }

  private progress = 0
  getProgress = () => this.progress

  calculateQuestionsMap = (schema: FullyLoadedDeclaration) => {
    const getQuestions = (question: any) => {
      if (question.answers) {
        return [question, ...question.answers.flatMap(getQuestions)]
      }
      return [question]
    }

    return schema.pages.reduce((tot: QuestionsMap, cur: Page) => {
      cur.questions
        .map(getQuestions)
        .flat()
        .forEach(item => (tot[item.code] = item))
      return tot
    }, {})
  }

  setRerenderCallback = (cb: () => void) => {
    this.rerenderCallback = cb
  }

  getVisibleQuestionFromPage = (page: Page) => {
    return this.visibilityKeeper.getList(page.code, page.questions, 0)
  }

  setActivePage = (page: Page) => {
    if (this.pagesKeeper.getActivePage() === page) {
      return
    }
    this.touchKeeper.touchAllFromPage(this.pagesKeeper.getActivePage())
    this.pagesKeeper.setActivePage(page)
    this.validateKeeper.refreshQuestionCache({} as any, 0) // TODO::сделать нормальным методом
    this.rerenderCallback && this.rerenderCallback()
  }

  setActiveTab = (tab: string) => {
    this.pagesKeeper.setActiveTab(tab)
    this.rerenderCallback && this.rerenderCallback()
  }

  filterMutlipleQuestionChilds = (
    multipleQuestion: MultipleQuestion,
    id: number
  ) => {
    return this.visibilityKeeper.getList(
      multipleQuestion.code,
      multipleQuestion.answers,
      id
    ) as SingleQuestion[]
  }

  getDefaultMutlipleQuestion = (page: Page) => {
    return page.questions.find(item => item.type === 'multiple')
  }

  getDefaultCheckboxQuestion = (page: Page) => {
    return Object.values(this.questionsMap).find(
      item =>
        item.type === 'checkbox' &&
        !!item.action &&
        item.action.type === 'show_pages' &&
        item.action.codes.includes(page.code)
    ) as CheckboxQuestion | undefined
  }

  isPageEmpty = (page: Page) => {
    const defaultQuestion = this.getDefaultMutlipleQuestion(page)
    if (defaultQuestion) {
      const ids = this.getMultipleIds(defaultQuestion.code)
      return ids.length === 0
    }
    const checkboxQuestion = this.getDefaultCheckboxQuestion(page)
    if (checkboxQuestion) {
      const value = this.valuesKeeper.getValue(checkboxQuestion.code)
      return value !== '1'
    }
    return false
  }

  /**
   * Вызывать, когда меняем чекбокс,
   * если ставим чекбокс, который показывает страницу, и у этой страницы
   * есть multipleQuestion, и в нем нет вариантов, то добавляем вариант
   */
  private processCheckboxChange = (question: CheckboxQuestion) => {
    if (
      question.action &&
      question.action.type === 'show_pages' &&
      question.action.codes.length
    ) {
      const pageCode = question.action.codes[0]
      const page = this.pagesKeeper.pages.find(item => item.code === pageCode)
      if (!page) {
        return
      }
      const defaultQuestion = this.getDefaultMutlipleQuestion(page)
      if (!defaultQuestion) {
        return
      }
      const ids = this.getMultipleIds(defaultQuestion.code)
      if (!ids.length) {
        this.valuesKeeper.addMultiple(
          defaultQuestion.code,
          new Date().valueOf()
        )
      }
    }
  }

  getQuestionProps = (question: Question, id: number): QuestionProps => {
    if (question.type === 'address') {
      const t: AddressQuestionProps = {
        question: question as AddressQuestion,
        value: this.valuesKeeper.getValue(question.code, id),
        setValue: newValue => {
          if (!this.valuesKeeper.setValue(question.code, id, newValue)) {
            return
          }
          this.statistics = undefined
          this.pagesKeeper.needDownload = false
          this.pagesKeeper.processChangeValue(
            question.code,
            this.valuesKeeper.getValue
          )
          this.touchKeeper.setTouch(question.code, id, true)
          if (
            hasForceValueAction(question) ||
            hasActions(question) ||
            hasActionsOnChild(question) ||
            isAutocompleteWithActions(question)
          ) {
            this.visibilityKeeper.clearVisibility()
          }
          this.calculateProgress()
          this.visibilityKeeper.clearRequired()
          this.validateKeeper.refreshQuestionCache(question, id)
          this.rerenderCallback && this.rerenderCallback()
        },
        errors: AddressModel.validate(
          this.valuesKeeper.getValue(question.code, id),
          (name: string) =>
            this.touchKeeper.getTouch(
              AddressModel.getFullCodeName(question, name),
              id
            ),
          !!question.validation && !!question.validation.shortAnswer,
          true
        ),
        setTouched: (name: string) => {
          if (
            !this.touchKeeper.setTouch(
              AddressModel.getFullCodeName(question, name),
              id,
              true
            )
          ) {
            return
          }
          this.validateKeeper.refreshQuestionCache(question, id)
          this.rerenderCallback && this.rerenderCallback()
        },
        declaration: this,
      }
      return t
    } else if (question.type !== 'multiple') {
      const t: SingleQuestionProps = {
        question: question as any, // TODO
        value: this.valuesKeeper.getValue(question.code, id),
        setActive: () => {
          if (this.pagesKeeper.getActiveQuestion() === question) {
            return
          }
          this.pagesKeeper.setActiveQuestion(question)
          this.rerenderCallback && this.rerenderCallback()
        },
        setValue: newValue => {
          if (!this.valuesKeeper.setValue(question.code, id, newValue)) {
            return
          }
          if (question.page.type !== 'statement') {
            this.statistics = undefined
            this.pagesKeeper.needDownload = false
            this.pagesKeeper.processChangeValue(
              question.code,
              this.valuesKeeper.getValue
            )
          }
          if (newValue === '1' && question.type === 'checkbox') {
            this.processCheckboxChange(question)
          }
          this.touchKeeper.setTouch(question.code, id, true)
          if (
            hasForceValueAction(question) ||
            hasActions(question) ||
            hasActionsOnChild(question) ||
            isAutocompleteWithActions(question)
          ) {
            this.visibilityKeeper.clearVisibility()
          }
          if (question.page.type !== 'statement') {
            this.calculateProgress()
          }
          this.visibilityKeeper.clearRequired()
          this.validateKeeper.refreshQuestionCache(question, id)
          this.rerenderCallback && this.rerenderCallback()
        },
        errors: this.validateKeeper.validateQuestion(question, id),
        setTouched: () => {
          if (!this.touchKeeper.setTouch(question.code, id, true)) {
            return
          }
          this.validateKeeper.refreshQuestionCache(question, id)
          this.rerenderCallback && this.rerenderCallback()
        },
        setAutocompleteActionIndex: (actionIndex: string) =>
          this.valuesKeeper.processAutocompleteWithActions(
            question,
            id,
            actionIndex
          ),
        declaration: this,
      }
      return t
    } else {
      return {
        getTitle: (id: number) => {
          return (
            this.filterMutlipleQuestionChilds(question, id)
              .filter(item => !!item.title_type)
              .map(item => this.valuesKeeper.getValue(item.code, id))
              .filter(item => !!item)
              .join(', ') || undefined
          )
        },
        question: question as MultipleQuestion,
        ids: this.valuesKeeper.getMultipleIds(question.code),
        getQuestionProps: this.getQuestionProps,
        addMultiple: (code: string, timestamp: number) => {
          this.valuesKeeper.addMultiple(code, timestamp)
          this.validateKeeper.refreshQuestionCache(question, 0)
          this.rerenderCallback && this.rerenderCallback()
        },
        deleteMultiple: (code: string, timestamp: number) => {
          this.valuesKeeper.deleteMultiple(code, timestamp)
          this.validateKeeper.refreshQuestionCache(question, 0)
          this.rerenderCallback && this.rerenderCallback()
        },
        copyMultiple: (code: string, id: number) => {
          this.valuesKeeper.copyMultiple(code, id)
          this.rerenderCallback && this.rerenderCallback()
        },
        filterMultipleChilds: this.filterMutlipleQuestionChilds,
      }
    }
  }
}
