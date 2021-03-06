import {h} from 'preact'
import {View} from '../../decorators/view'
import {QuillComponent} from '../../util/quill-component'
import {FormProps} from '../forms/types'
import './input-number.pcss'
import {default as formatter, format as Format} from 'format-number'
import {GlobalEvent} from '../../decorators/global-event'
import {Icon} from '../icon/icon'
import {localized} from '../../util/localization'
import {cls} from '../../util/utils'
import {showErrors, ValidationContext} from '../forms/form'

export interface InputNumberState {
    value: number
    dot: boolean
}

export interface InputNumberProps extends FormProps<number> {
    integer?: boolean
    prefix?: string
    suffix?: string
}

const formatConfig = {
    integerSeparator: '\u2009',
    decimalsSeparator: '',
    decimal: '.',
    truncate: 2
}

/**
 * experimental, android has limitations
 * 27.05.2018: firefox needs dom.select_events.textcontrols.enabled=true in about:config
 */
@View
export class InputNumber extends QuillComponent<InputNumberProps, InputNumberState> {

    format: Format
    input: HTMLInputElement
    changingSelection = false

    static defaultProps = {
        integer: true,
        suffix: '',
        prefix: ''
    }

    constructor(props) {
        super(props)
        const {prefix, suffix, value} = props
        this.format = formatter({...formatConfig, prefix: localized(prefix), suffix: localized(suffix)})
        this.state = {
            value,
            dot: false
        }
    }

    validateKey = (ev: KeyboardEvent) => {
        const {ctrlKey, key} = ev
        if (!ctrlKey && key.length === 1) {
            if (!/^[\-\d.]$/.test(key)) {
                ev.preventDefault()
            }
        }
    }

    onChange = (ev: KeyboardEvent) => {
        const {ctrlKey, key} = ev
        if (!key) {
            return
        }
        if (!ctrlKey && /^[0-9]$/.test(key) || /null|backspace|delete/i.test(key)) {
            const {state, input, input: {selectionStart, selectionEnd}} = this
            const old =  this.format(state.value)
            const n = this.rawNumber()
            if (!this.state.dot || key !== '0') {
                this.setState({value: n, dot: false})
                this.forceUpdate(() => {
                    this.changingSelection = true
                    const offset = Math.max(0, this.format(n).length - old.length - 1)
                    input.selectionStart = selectionStart + offset
                    input.selectionEnd = selectionEnd + offset
                    this.changingSelection = false
                })
            }
        }
        if (!ctrlKey && /^[.\-]$/.test(key)) { // after dot was entered we need to allow 0s without formatting the number
            this.setState({dot: true})
        }
    }

    rawNumber = () => {
        const {input, props} = this
        const str = input.value.replace(/[^\-\d.]/g, '')
        return props.integer ?
            parseInt(str, 10) :
            parseFloat(str)
    }

    copy = (ev) => {
        ev.preventDefault()
        ev.clipboardData.setData('text/plain', `${this.rawNumber()}`)
    }

    @GlobalEvent('selectionchange', document)
    selectionChange = () => {
        const {props: {prefix, suffix}, input} = this
        if (!this.changingSelection && document.activeElement === input) {
            this.changingSelection = true
            input.selectionStart = Math.max(input.selectionStart, prefix.length)
            input.selectionEnd = Math.min(input.selectionEnd, input.value.length - suffix.length)
            setTimeout(() => this.changingSelection = false, 10)
        }
    }

    shouldComponentUpdate() {
        return false
    }

    confirm = () => {
        this.forceUpdate()
        this.props.changes(this.rawNumber())
    }

    change = (diff: number) => () => {
        this.setState({value: this.rawNumber() + diff})
        this.confirm()
    }

    androidBeforeInput = (ev) => {
        ev.key = `${ev.data}`
        this.validateKey(ev)
    }

    androidInput = (ev) => {
        ev.key = `${ev.data}`
        this.onChange(ev)
    }

    componentDidMount(): void {
        if (/android/i.test(navigator.userAgent)) {
            this.input.addEventListener('beforeinput', this.androidBeforeInput)
            this.input.addEventListener('input', this.androidInput)
        }
        if (/firefox/i.test(navigator.userAgent)) {
            this.input.addEventListener('focus', this.selectionChange)
            this.input.addEventListener('selectionchange', this.selectionChange)
        }
    }

    componentWillUnmount(): void {
        if (/android/i.test(navigator.userAgent)) {
            this.input.removeEventListener('beforeinput', this.androidBeforeInput)
            this.input.removeEventListener('input', this.androidInput)
        }
        if (/firefox/i.test(navigator.userAgent)) {
            this.input.removeEventListener('focus', this.selectionChange)
            this.input.removeEventListener('selectionchange', this.selectionChange)
        }
    }

    render({children, changes, integer, name, placeHolder, disabled, ...props}, {value}) {
        return (
            <ValidationContext.Consumer>{validation => {
                const errors = showErrors(validation, name)
                return (
                    <div class="control two-icons has-icons-right number-input">
                    <input
                        ref={i => this.input = i}
                        type="text"
                        placeholder={localized(placeHolder)}
                        class={cls('input is-small', {error: errors})}
                        value={this.format(value)}
                        disabled={disabled}
                        onBlur={this.confirm}
                        onCopy={this.copy}
                        onKeyUp={this.onChange}
                        onKeyDown={this.validateKey}/>
                    {!disabled && integer ? <Icon name="chevron-up" right={true} onClick={this.change(1)}/> : null}
                    {!disabled && integer ? <Icon name="chevron-down" right={true} onClick={this.change(-1)}/> : null}
                    {children}
                    {errors}
                </div>)
            }}</ValidationContext.Consumer>
        )
    }
}
