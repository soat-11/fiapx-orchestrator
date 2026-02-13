Feature: List User Videos
  As a user
  I want to list all my uploaded videos
  So that I can monitor their processing status

  Scenario: Successfully list videos
    Given a user with ID "user-123" who has uploaded 2 videos
    When the user requests to list their videos
    Then the system should return a mapped list of 2 videos

  Scenario: Repository throws an error
    Given a user with ID "user-123"
    And the database is unavailable
    When the user requests to list their videos
    Then the operation should fail with an internal error