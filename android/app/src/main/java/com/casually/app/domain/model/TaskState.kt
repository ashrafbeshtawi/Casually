package com.casually.app.domain.model

enum class TaskState(val label: String) {
    ACTIVE("Active"),
    WAITING("Waiting"),
    BLOCKED("Blocked"),
    DONE("Done");

    companion object {
        fun validTransitions(from: TaskState): List<TaskState> = when (from) {
            ACTIVE -> listOf(WAITING, BLOCKED, DONE)
            WAITING -> listOf(ACTIVE, BLOCKED, DONE)
            BLOCKED -> listOf(ACTIVE, WAITING, DONE)
            DONE -> listOf(ACTIVE, WAITING)
        }
    }
}
