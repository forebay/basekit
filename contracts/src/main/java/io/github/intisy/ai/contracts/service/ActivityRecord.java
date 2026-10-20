package io.github.intisy.ai.contracts.service;

import io.github.intisy.ai.tsemit.TsInterface;
import io.github.intisy.ai.tsemit.TsOptional;
import java.util.List;
import java.util.Map;

/** One activity as it is read back. */
@TsInterface(data = true)
public interface ActivityRecord {
    /**
     * What this record is addressed by, unique within the home.
     *
     * @return the record's id.
     */
    String id();

    /**
     * When it happened, in epoch milliseconds.
     *
     * @return the timestamp.
     */
    double ts();

    /**
     * Absolute path of the app home it was recorded in.
     *
     * @return the home path.
     */
    String home();

    /**
     * What kind of thing happened, which is what a reader filters on.
     *
     * @return the topic.
     */
    String topic();

    /**
     * What was done, within the topic.
     *
     * @return the action.
     */
    String action();

    /**
     * How much this activity mattered, which is what a surface sorts and colours by.
     *
     * @return the impact.
     */
    ActivityImpact impact();

    /**
     * Who recorded it, normally a plugin id.
     *
     * @return the source id.
     */
    String source();

    /**
     * What the activity was about, when it was about one identifiable thing.
     *
     * @return the subject, or null when the activity names none.
     */
    @TsOptional
    ActivitySubject subject();

    /**
     * Everything the recorder attached that has no field of its own.
     *
     * @return the details, empty when the recorder attached none.
     */
    Map<String, Object> details();

    /**
     * One line describing the activity, for a surface that renders text.
     *
     * @return the rendered line.
     */
    String text();

    /**
     * Monotonic only within the emitting process, so two processes racing into one home can tie.
     *
     * @return the sequence number, or null on a record written before the field existed.
     */
    @TsOptional
    Integer seq();

    /**
     * Who did it.
     *
     * @return the actor.
     */
    ActivityActor actor();

    /**
     * Where it was recorded.
     *
     * @return the origin.
     */
    ActivityOrigin origin();

    /**
     * What it acted on, when that is not where it was recorded.
     *
     * @return the target, or null for the ordinary same-home case.
     */
    @TsOptional
    ActivityTarget target();

    /**
     * Why it happened.
     *
     * @return the cause.
     */
    ActivityCause cause();

    /**
     * The chain it belongs to.
     *
     * @return the trace.
     */
    ActivityTrace trace();

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
     * The values it changed.
     *
     * @return the changes, or null when it changed no named values.
     */
    @TsOptional
    List<ActivityValueChange> changes();
}
