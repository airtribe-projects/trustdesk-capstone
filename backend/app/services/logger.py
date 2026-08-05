from app.models.ai_run import AIRun


def log_ai_run(
    db,
    ticket_id,
    run_type,
    retrieved_docs,
    recommended_tool,
    guardrail_status,
    final_status,
):

    run = AIRun(

        ticket_id=ticket_id,

        run_type=run_type,

        retrieved_docs=",".join(retrieved_docs),

        recommended_tool=recommended_tool,

        guardrail_status=guardrail_status,

        final_status=final_status,

    )

    db.add(run)

    db.commit()

    db.refresh(run)

    return run