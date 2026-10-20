package io.github.intisy.ai.contracts.service;

import io.github.intisy.ai.tsemit.TsInterface;
import io.github.intisy.ai.tsemit.TsOptional;

/** Why an activity happened, carried down a scope so every event inside it inherits the same one. */
@TsInterface(data = true)
public interface ActivityCause {
    /**
     * What set the work in motion.
     *
     * @return the cause's kind.
     */
    ActivityCauseKind kind();

    /**
     * Where it was set in motion, for a cause a person triggered.
     *
     * @return the surface, or null when nothing triggered it from one.
     */
    @TsOptional
    String surface();

    /**
     * Anything more the cause is worth qualifying by.
     *
     * @return the detail, or null when there is none.
     */
    @TsOptional
    String detail();
}
