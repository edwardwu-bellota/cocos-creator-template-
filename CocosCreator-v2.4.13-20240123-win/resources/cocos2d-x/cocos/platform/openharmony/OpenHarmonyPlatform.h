/****************************************************************************
 Copyright (c) 2021-2023 Xiamen Yaji Software Co., Ltd.

 http://www.cocos.com

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
****************************************************************************/

#pragma once

// #include "platform/UniversalPlatform.h"

#include <ace/xcomponent/native_interface_xcomponent.h>

#include <uv.h>
#include <string>
#include <unordered_map>
#include <napi/native_api.h>
#include "cocos/scripting/js-bindings/jswrapper/SeApi.h"
#include "platform/openharmony/WorkerMessageQueue.h"
#include "scripting/js-bindings/event/EventDispatcher.h"
#include "platform/openharmony/render/egl_core.h"
#include "platform/openharmony/AppDelegate.h"

namespace cocos2d {
#define NANOSECONDS_PER_SECOND 1000000000
#define NANOSECONDS_60FPS      16666667L
class OpenHarmonyPlatform {
public:
    OpenHarmonyPlatform();
    int32_t init();
    static OpenHarmonyPlatform* getInstance();

    void onCreateNative(napi_env env, uv_loop_t* loop);
    void onShowNative();
    void onHideNative();
    void onDestroyNative();

    void workerInit(napi_env env, uv_loop_t* loop);

    void setNativeXComponent(OH_NativeXComponent* component);

    int32_t run(int argc, const char** argv);
    void resume();
    void pause();
    int32_t loop();

    void requestVSync();
    
    void enqueue(const WorkerMessageData& data);
    bool dequeue(WorkerMessageData* data);

    void triggerMessageSignal();
public:
    // Callback, called by ACE XComponent
    void onSurfaceCreated(OH_NativeXComponent* component, void* window);
    void onSurfaceChanged(OH_NativeXComponent* component, void* window);
    void onSurfaceDestroyed(OH_NativeXComponent* component, void* window);
    void dispatchTouchEvent(OH_NativeXComponent* component, void* window);
    
    static void onMessageCallback(const uv_async_t* req);
    static void timerCb(uv_timer_t* handle);
    void tick();
    void setPreferedFramePersecond(int fps);

    int64_t _prefererredNanosecondsPerFrame{NANOSECONDS_60FPS};
    OH_NativeXComponent* _component{nullptr};
    OH_NativeXComponent_Callback _callback;
    uv_timer_t _timerHandle;
    uv_loop_t* _workerLoop{nullptr};
    uv_async_t _messageSignal{};
    WorkerMessageQueue _messageQueue;
    EGLCore* eglCore_{nullptr};

    uint64_t width_;
    uint64_t height_;
    Application* g_app = nullptr;
    //game started
    bool g_started = false;
};
} // namespace cc