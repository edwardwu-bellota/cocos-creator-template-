(function () {
    if (!(cc && cc.EditBox)) {
        return;
    }
    
    const EditBox = cc.EditBox;
    const js = cc.js;
    const KeyboardReturnType = EditBox.KeyboardReturnType;
    const MAX_VALUE = 65535;
    const KEYBOARD_HIDE_TIME = 600;
    let _hideKeyboardTimeout = null;
    let _currentEditBoxImpl = null;

    function getKeyboardReturnType (type) {
        switch (type) {
            case KeyboardReturnType.DEFAULT:
            case KeyboardReturnType.DONE:
                return 'done';
            case KeyboardReturnType.SEND:
                return 'send';
            case KeyboardReturnType.SEARCH:
                return 'search';
            case KeyboardReturnType.GO:
                return 'go';
            case KeyboardReturnType.NEXT:
                return 'next';
        }
        return 'done';
    }

    const BaseClass = EditBox._ImplClass;
    function MiniGameEditBoxImpl () {
        BaseClass.call(this);

        this._eventListeners = {
            onKeyboardInput: null,
            onKeyboardConfirm: null,
            onKeyboardComplete: null,
        };
    }

    js.extend(MiniGameEditBoxImpl, BaseClass);
    EditBox._ImplClass = MiniGameEditBoxImpl;

    Object.assign(MiniGameEditBoxImpl.prototype, {
        init (delegate) {
            if (!delegate) {
                cc.error('EditBox init failed');
                return;
            }
            this._delegate = delegate;
        },

        beginEditing () {
            // In case multiply register events
            if (this._editing) {
                return;
            }
            this._ensureKeyboardHide(() => {
                let delegate = this._delegate;
                this._showKeyboard();
                this._registerKeyboardEvent();
                this._editing = true;
                _currentEditBoxImpl = this;
                delegate.editBoxEditingDidBegan();
            });
        },

        endEditing () {
            this._hideKeyboard();
            let cbs = this._eventListeners;
            cbs.onKeyboardComplete && cbs.onKeyboardComplete();
        },

        _registerKeyboardEvent () {
            let self = this;
            let delegate = this._delegate;
            let cbs = this._eventListeners;

            cbs.onKeyboardInput = function (res) {
                if (delegate._string !== res.value) {
                    delegate.editBoxTextChanged(res.value);
                }
            }

            cbs.onKeyboardConfirm = function (res) {
                delegate.editBoxEditingReturn();
                let cbs = self._eventListeners;
                cbs.onKeyboardComplete && cbs.onKeyboardComplete(res);
            }

            cbs.onKeyboardComplete = function (res) {
                self._editing = false;
                _currentEditBoxImpl = null;
                self._unregisterKeyboardEvent();
                if (res && res.value && delegate._string !== res.value) {
                    delegate.editBoxTextChanged(res.value);
                }
                delegate.editBoxEditingDidEnded();
            }

            __globalAdapter.onKeyboardInput(cbs.onKeyboardInput);
            __globalAdapter.onKeyboardConfirm(cbs.onKeyboardConfirm);
            __globalAdapter.onKeyboardComplete(cbs.onKeyboardComplete);
        },

        _unregisterKeyboardEvent () {
            let cbs = this._eventListeners;

            if (cbs.onKeyboardInput) {
                __globalAdapter.offKeyboardInput(cbs.onKeyboardInput);
                cbs.onKeyboardInput = null;
            }
            if (cbs.onKeyboardConfirm) {
                __globalAdapter.offKeyboardConfirm(cbs.onKeyboardConfirm);
                cbs.onKeyboardConfirm = null;
            }
            if (cbs.onKeyboardComplete) {
                __globalAdapter.offKeyboardComplete(cbs.onKeyboardComplete);
                cbs.onKeyboardComplete = null;
            }
        },

        _otherEditing () {
            return !!_currentEditBoxImpl && _currentEditBoxImpl !== this && _currentEditBoxImpl._editing;
        },

        _ensureKeyboardHide (cb) {
            let otherEditing = this._otherEditing();
            if (!otherEditing && !_hideKeyboardTimeout) {
                return cb();
            }
            if (_hideKeyboardTimeout) {
                clearTimeout(_hideKeyboardTimeout);
            }
            if (otherEditing) {
                _currentEditBoxImpl.endEditing();
            }
            _hideKeyboardTimeout = setTimeout(() => {
                _hideKeyboardTimeout = null;
                cb();
            }, KEYBOARD_HIDE_TIME);
        },

        _showKeyboard () {
            let delegate = this._delegate;
            let multiline = (delegate.inputMode === EditBox.InputMode.ANY);
            let maxLength = (delegate.maxLength < 0 ? MAX_VALUE : delegate.maxLength);

            __globalAdapter.showKeyboard({
                defaultValue: delegate._string,
                maxLength: maxLength,
                multiple: multiline,
                confirmHold: false,
                confirmType: getKeyboardReturnType(delegate.returnType),
                success (res) {

                },
                fail (res) {
                    cc.warn(res.errMsg);
                }
            });
        },

        _hideKeyboard () {
            __globalAdapter.hideKeyboard({
                success (res) {
                    
                },
                fail (res) {
                    cc.warn(res.errMsg);
                },
            });
        },
    });
})();

