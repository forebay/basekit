package io.github.intisy.ai.contracts.service;

import io.github.intisy.ai.tsemit.TsInterface;
import io.github.intisy.ai.tsemit.TsOptional;
import java.util.List;
import java.util.Map;

/** What a plugin hands the activity record to have one activity written down. */
@TsInterface(data = true)
public interface ActivitySpec {
    /**
     * Dotted topic the activity belongs to, for example {@code config.changed}.
     *
     * @return the topic.
     */
    String topic();

    /**
     * What happened, as one verb.
     *
     * @return the action.
     */
    String action();

    /**
     * How much it matters. The implementation picks a default per topic when this is absent.
     *
     * @return the impact, or null to take the topic's default.
     */
    @TsOptional
    ActivityImpact impact();

    /**
     * What the activity was about, when it was about one identifiable thing.
     *
     * @return the subject, or null when the activity names none.
     */
    @TsOptional
    ActivitySubject subject();

    /**
     * Anything else worth keeping, which a surface renders as it likes.
     *
     * @return the details, or null when there are none.
     */
    @TsOptional
    Map<String, Object> details();

    /**
     * Who did it. The implementation defaults it per topic when this is absent.
     *
     * @return the actor, or null to take the topic's default.
     */
    @TsOptional
    ActivityActor actor();

    /**
     * What it acted on, when that is not where it was recorded.
     *
     * @return the target, or null for the ordinary same-home case.
     */
    @TsOptional
    ActivityTarget target();

    /**
     * Why it happened. The implementation takes this from the enclosing scope when it is absent.
     *
     * @return the cause, or null to inherit the scope's.
     */
    @TsOptional
    ActivityCause cause();

    /**
     * Whether the work succeeded, for an activity that reports one.
     *
     * @return the outcome, or null for an activity that reports none.
     */
    @TsOptional
    ActivityOutcome outcome();

    /**
     * How long the work took, in milliseconds.
     *
     * @return the duration, or null for an activity that is not timed.
     */
    @TsOptional
    Integer durationMs();

    /**
     * The values it changed, redacted on the way in.
     *
     * @return the changes, or null when it changed no named values.
     */
    @TsOptional
    List<ActivityValueChange> changes();
}
