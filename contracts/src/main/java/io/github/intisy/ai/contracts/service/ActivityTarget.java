package io.github.intisy.ai.contracts.service;

import io.github.intisy.ai.tsemit.TsInterface;
import io.github.intisy.ai.tsemit.TsOptional;

/**
 * What an activity acted ON, when that is somewhere other than where it was recorded.
 *
 * @implNote Absent for the ordinary case. A target that only repeats the origin says nothing, so
 * it is set only for a genuine cross-home or cross-app effect.
 */
@TsInterface(data = true)
public interface ActivityTarget {
    /**
     * The app acted on, when it is not the one recording.
     *
     * @return the app acted on, or null when it is the recording one.
     */
    @TsOptional
    String app();

    /**
     * Absolute path of the home acted on, when it is not the one recording.
     *
     * @return the home acted on, or null when it is the recording one.
     */
    @TsOptional
    String home();
}
