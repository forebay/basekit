package io.github.intisy.ai.contracts.service;

import io.github.intisy.ai.tsemit.TsEnum;

/** Who caused an activity: a person, the machinery itself, or an app acting on its own. */
@TsEnum
public enum ActivityActor {
    /** A person asked for it. */
    user,
    /** The machinery did it without being asked. */
    system,
    /** An app did it on its own behalf. */
    app
}
