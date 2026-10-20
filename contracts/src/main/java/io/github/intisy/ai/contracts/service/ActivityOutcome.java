package io.github.intisy.ai.contracts.service;

import io.github.intisy.ai.tsemit.TsEnum;

/** Whether the work an activity reports succeeded. */
@TsEnum
public enum ActivityOutcome {
    /** The work finished as asked. */
    ok,
    /** The work did not finish. */
    failed
}
