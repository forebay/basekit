package io.github.intisy.ai.contracts.service;

import io.github.intisy.ai.tsemit.TsEnum;

/** What set an activity in motion, which is what lets a chain of events read back as one story. */
@TsEnum
public enum ActivityCauseKind {
    /** A person asked for it. */
    user,
    /** It happened while something was starting. */
    startup,
    /** It happened while something was stopping. */
    shutdown,
    /** A timetable asked for it. */
    schedule,
    /** A hook fired it. */
    hook,
    /** A watcher saw something change. */
    watch,
    /** A call from outside asked for it. */
    api,
    /** Another activity led to it. */
    cascade,
    /** Nothing said what set it in motion. */
    unknown
}
