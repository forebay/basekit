package io.github.intisy.ai.contracts.service;

import io.github.intisy.ai.tsemit.TsInterface;
import io.github.intisy.ai.tsemit.TsOptional;

/** One value that changed, kept with its key visible even when the value itself is redacted. */
@TsInterface(data = true)
public interface ActivityValueChange {
    /**
     * What changed, kept visible even when the values are not.
     *
     * @return the key that changed.
     */
    String key();

    /**
     * The old value.
     *
     * @return the value before the change, or null when it was redacted.
     */
    @TsOptional
    Object from();

    /**
     * The new value.
     *
     * @return the value after the change, or null when it was redacted.
     */
    @TsOptional
    Object to();

    /**
     * Whether the key named a secret, so neither value is carried.
     *
     * @return true when both values were redacted, or null when neither was.
     */
    @TsOptional
    Boolean redacted();
}
