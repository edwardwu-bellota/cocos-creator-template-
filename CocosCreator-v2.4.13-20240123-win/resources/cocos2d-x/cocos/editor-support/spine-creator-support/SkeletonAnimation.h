/******************************************************************************
 * Spine Runtimes License Agreement
 * Last updated May 1, 2019. Replaces all prior versions.
 *
 * Copyright (c) 2013-2019, Esoteric Software LLC
 *
 * Integration of the Spine Runtimes into software or otherwise creating
 * derivative works of the Spine Runtimes is permitted under the terms and
 * conditions of Section 2 of the Spine Editor License Agreement:
 * http://esotericsoftware.com/spine-editor-license
 *
 * Otherwise, it is permitted to integrate the Spine Runtimes into software
 * or otherwise create derivative works of the Spine Runtimes (collectively,
 * "Products"), provided that each user of the Products must obtain their own
 * Spine Editor license and redistribution of the Products in any form must
 * include this license and copyright notice.
 *
 * THIS SOFTWARE IS PROVIDED BY ESOTERIC SOFTWARE LLC "AS IS" AND ANY EXPRESS
 * OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 * OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN
 * NO EVENT SHALL ESOTERIC SOFTWARE LLC BE LIABLE FOR ANY DIRECT, INDIRECT,
 * INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING,
 * BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES, BUSINESS
 * INTERRUPTION, OR LOSS OF USE, DATA, OR PROFITS) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE,
 * EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *****************************************************************************/

#pragma once
#include "spine/spine.h"
#include "spine-creator-support/SkeletonRenderer.h"

namespace spine {

typedef std::function<void(TrackEntry* entry)> StartListener;
typedef std::function<void(TrackEntry* entry)> InterruptListener;
typedef std::function<void(TrackEntry* entry)> EndListener;
typedef std::function<void(TrackEntry* entry)> DisposeListener;
typedef std::function<void(TrackEntry* entry)> CompleteListener;
typedef std::function<void(TrackEntry* entry, Event* event)> EventListener;

/** Draws an animated skeleton, providing an AnimationState for applying one or more animations and queuing animations to be
  * played later. */
class SkeletonAnimation: public SkeletonRenderer {
public:
    static SkeletonAnimation* create();
    static SkeletonAnimation* createWithData (SkeletonData* skeletonData, bool ownsSkeletonData = false);
    static SkeletonAnimation* createWithJsonFile (const std::string& skeletonJsonFile, Atlas* atlas, float scale = 1);
    static SkeletonAnimation* createWithJsonFile (const std::string& skeletonJsonFile, const std::string& atlasFile, float scale = 1);
    static SkeletonAnimation* createWithBinaryFile (const std::string& skeletonBinaryFile, Atlas* atlas, float scale = 1);
    static SkeletonAnimation* createWithBinaryFile (const std::string& skeletonBinaryFile, const std::string& atlasFile, float scale = 1);
    static void setGlobalTimeScale(float timeScale);
    
    // Use createWithJsonFile instead
    CC_DEPRECATED_ATTRIBUTE static SkeletonAnimation* createWithFile (const std::string& skeletonJsonFile, Atlas* atlas, float scale = 1) {
        return SkeletonAnimation::createWithJsonFile(skeletonJsonFile, atlas, scale);
    }
    // Use createWithJsonFile instead
    CC_DEPRECATED_ATTRIBUTE static SkeletonAnimation* createWithFile (const std::string& skeletonJsonFile, const std::string& atlasFile, float scale = 1) {
        return SkeletonAnimation::createWithJsonFile(skeletonJsonFile, atlasFile, scale);
    }

    virtual void update (float deltaTime) override;

    void setAnimationStateData (AnimationStateData* stateData);
    void setMix (const std::string& fromAnimation, const std::string& toAnimation, float duration);

    TrackEntry* setAnimation (int trackIndex, const std::string& name, bool loop);
    TrackEntry* addAnimation (int trackIndex, const std::string& name, bool loop, float delay = 0);
    TrackEntry* setEmptyAnimation (int trackIndex, float mixDuration);
    void setEmptyAnimations (float mixDuration);
    TrackEntry* addEmptyAnimation (int trackIndex, float mixDuration, float delay = 0);
    Animation* findAnimation(const std::string& name) const;
    TrackEntry* getCurrent (int trackIndex = 0);
    void clearTracks ();
    void clearTrack (int trackIndex = 0);

    void setStartListener (const StartListener& listener);
    void setInterruptListener (const InterruptListener& listener);
    void setEndListener (const EndListener& listener);
    void setDisposeListener (const DisposeListener& listener);
    void setCompleteListener (const CompleteListener& listener);
    void setEventListener (const EventListener& listener);

    void setTrackStartListener (TrackEntry* entry, const StartListener& listener);
    void setTrackInterruptListener (TrackEntry* entry, const InterruptListener& listener);
    void setTrackEndListener (TrackEntry* entry, const EndListener& listener);
    void setTrackDisposeListener (TrackEntry* entry, const DisposeListener& listener);
    void setTrackCompleteListener (TrackEntry* entry, const CompleteListener& listener);
    void setTrackEventListener (TrackEntry* entry, const EventListener& listener);

    virtual void onAnimationStateEvent (TrackEntry* entry, EventType type, Event* event);
    virtual void onTrackEntryEvent (TrackEntry* entry, EventType type, Event* event);
    virtual void destroy();

    AnimationState* getState() const;
    
CC_CONSTRUCTOR_ACCESS:
    SkeletonAnimation ();
    virtual ~SkeletonAnimation ();
    virtual void initialize () override;
    
public:
    static float GlobalTimeScale;
protected:
    AnimationState*       _state = nullptr;
    bool                    _ownsAnimationStateData = false;
    StartListener           _startListener = nullptr;
    InterruptListener       _interruptListener = nullptr;
    EndListener             _endListener = nullptr;
    DisposeListener         _disposeListener = nullptr;
    CompleteListener        _completeListener = nullptr;
    EventListener           _eventListener = nullptr;
private:
    typedef SkeletonRenderer super;
};

}
