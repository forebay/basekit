package io.github.intisy.ai.contracts.service;

import io.github.intisy.ai.tsemit.TsInterface;
import io.github.intisy.ai.tsemit.TsOptional;

/** Ties one activity to the chain it belongs to, so a consequence can be read back to its cause. */
@TsInterface(data = true)
public interface ActivityTrace {
    /**
     * Shared by every activity in one chain.
     *
     * @return the chain's id.
     */
    String id();

    /**
     * The activity this one follows from.
     *
     * @return the id of the activity it follows, or null for the first in a chain.
     */
    @TsOptional
    String causedBy();
}
