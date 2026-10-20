package io.github.intisy.ai.contracts.service;

import io.github.intisy.ai.tsemit.TsInterface;
import io.github.intisy.ai.tsemit.TsOptional;

/** Where an activity was recorded: which app, which home, and which entry point. */
@TsInterface(data = true)
public interface ActivityOrigin {
    /**
     * The app that recorded it, or the standalone marker when no app owns the process.
     *
     * @return the recording app.
     */
    String app();

    /**
     * Absolute path of the home it was recorded in.
     *
     * @return the recording home.
     */
    String home();

    /**
     * Which entry point of that app, when the process states one.
     *
     * @return the entry point, or null when the process states none.
     */
    @TsOptional
    String entry();

    /**
     * The recording process, for telling two concurrent runs apart.
     *
     * @return the process id, or null when it is not known.
     */
    @TsOptional
    Integer pid();
}
